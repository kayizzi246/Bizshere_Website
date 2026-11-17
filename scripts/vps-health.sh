#!/bin/sh
# Why is the server slow, and why will Coolify not open?
#
# Run it on the VPS over SSH. It only reads — nothing is stopped, deleted or changed:
#
#   sh scripts/vps-health.sh          # from a checkout on the server
#   curl -fsSL <raw-url> | sh         # or straight from the repo
#
# It answers the three questions that explain almost every slow Coolify box, in the order they
# go wrong: memory (a Next.js build is far heavier than the running site), disk (every build
# leaves layers behind until the disk fills), and whether the kernel has been killing things.
#
# Written 17 Nov 2026, after the admin UI stopped answering during a run of deploys.

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }
note() { printf '  %s\n' "$1"; }
verdict=""
add() { verdict="${verdict}  - $1\n"; }

say "1. Memory"
if [ -r /proc/meminfo ]; then
  total_kb=$(awk '/^MemTotal:/{print $2}' /proc/meminfo)
  avail_kb=$(awk '/^MemAvailable:/{print $2}' /proc/meminfo)
  swap_kb=$(awk '/^SwapTotal:/{print $2}' /proc/meminfo)
  # An older kernel has no MemAvailable, and a container may hide SwapTotal. Missing is not zero,
  # so default them and let the checks below pass rather than fail with "integer expected".
  : "${total_kb:=0}" "${avail_kb:=0}" "${swap_kb:=0}"
  note "Total      $((total_kb / 1024)) MB"
  note "Available  $((avail_kb / 1024)) MB"
  note "Swap       $((swap_kb / 1024)) MB"
  [ "$total_kb" -lt 2000000 ] && add "Only $((total_kb / 1024)) MB of RAM. A Next.js build needs about 2 GB on its own — while one runs, everything else on this box, Coolify's own screen included, is starved."
  [ "$swap_kb" -lt 100000 ] && add "There is no real swap. Without it a build that runs out of memory does not slow down, it is killed, and the server stays unresponsive until it gives up."
  [ "$avail_kb" -lt 200000 ] && add "Under 200 MB free right now — something is using the machine up as you read this."
else
  note "No /proc/meminfo (not Linux?)"
fi

say "2. Disk"
df -h / 2>/dev/null | awk 'NR==1 || NR==2'
used=$(df -P / 2>/dev/null | awk 'NR==2{gsub("%","",$5); print $5}')
case "$used" in (*[!0-9]*|"") used="" ;; esac
# A percentage is 0-100. Anything else means df printed a layout this did not expect.
[ -n "$used" ] && [ "$used" -gt 100 ] && used=""
[ -n "$used" ] && [ "$used" -ge 85 ] && add "The disk is ${used}% full. Docker stops being able to build well before 100%, and Coolify writes its database to the same disk."

say "3. What Docker is holding"
if command -v docker >/dev/null 2>&1; then
  docker system df 2>/dev/null || note "docker system df needs root — try with sudo"
else
  note "No docker command (try with sudo, or this is not the right machine)"
fi

say "4. Load"
if [ -r /proc/loadavg ]; then
  read -r l1 l5 l15 _ < /proc/loadavg
  cpus=$(nproc 2>/dev/null || echo 1)
  note "$l1 (1 min), $l5 (5 min), $l15 (15 min) across $cpus CPU(s)"
  over=$(awk -v l="$l1" -v c="$cpus" 'BEGIN{print (l > c * 2) ? 1 : 0}')
  [ "$over" = "1" ] && add "Load is more than twice the number of CPUs: the machine is queueing work, which is exactly how a web page comes to time out."
fi

say "5. The heaviest processes"
ps -eo pmem,pcpu,rss,comm --sort=-rss 2>/dev/null | head -8 ||
  ps aux 2>/dev/null | head -8

say "6. Has the kernel been killing things?"
kills=$( { dmesg 2>/dev/null || journalctl -k --no-pager -n 2000 2>/dev/null; } | grep -ci "out of memory\|oom-kill" )
if [ "${kills:-0}" -gt 0 ]; then
  note "Yes — $kills mention(s) of the out-of-memory killer."
  { dmesg 2>/dev/null || journalctl -k --no-pager -n 2000 2>/dev/null; } | grep -i "out of memory\|oom-kill" | tail -3 | sed 's/^/    /'
  add "The kernel has been killing processes to stay alive. A build killed this way leaves a half-finished deploy and a server that was unusable while it happened."
else
  note "Nothing recent (or the log is not readable without sudo)."
fi

say "7. Coolify itself"
if command -v docker >/dev/null 2>&1; then
  docker ps --filter name=coolify --format '  {{.Names}}  {{.Status}}' 2>/dev/null | grep . ||
    note "No running container named coolify (needs sudo, or it is down — see below)"
fi

say "Verdict"
if [ -n "$verdict" ]; then
  printf '%b' "$verdict"
  cat <<'TXT'

  What usually fixes it, in order:

  1. Give the machine swap, so a heavy build slows down instead of killing the box:
       sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile
       sudo mkswap /swapfile && sudo swapon /swapfile
       echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
     This is safe to run on a live server and takes a few seconds.

  2. Take back the disk Docker is holding (leftover layers from old builds):
       sudo docker builder prune -af
       sudo docker image prune -af
     Neither touches a running container, your database volume, or Coolify's own data.

  3. Deploy once, not four times. Each push to main starts another build; on a small box they
     queue and starve each other. Wait for one to finish before pushing again.

  4. If it is still slow after that, the box is too small for building on. Either move to one
     with 2 GB or more, or build the image elsewhere (a GitHub Action) and have Coolify pull it.
TXT
else
  printf "  Nothing here explains a slow server: memory, disk, load and the logs all look normal.\n  If Coolify's screen is still not opening, the problem is more likely its own container or the\n  network in front of it than the machine underneath:\n\n    sudo docker ps -a --filter name=coolify\n    sudo docker logs --tail 50 coolify\n"
fi
printf '\n'
