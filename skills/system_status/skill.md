---
skill: system_status
help: check the system (“is the pi overheating?”)
samples: 18
train_only: metric
---
# System status

Disk, CPU, temperature, memory, network and uptime. Each metric's command is after the arrow.
In the PWA the values are examples (the "sample" list); on the device the command's output is used.

## Slots
- metric: text

## Examples
- how much [{metric}](metric) {is left|do I have|is there|is free|is available}{?|}
- {show|show me|check|what's|what is|tell me} {the |my |}[{metric}](metric){?|}
- {check|show me|what's} {the |}[{metric}](metric) {usage|status|level}
- how{'s| is} the [{metric}](metric){ doing|}{?|}
- is the [{metric}](metric) {ok|okay|fine|too high|full|hot}{?|}
- {am I|are we} running out of [{metric}](metric){?|}
- {system|device} {status|info|health}{ please|}
- how{'s| is} the {system|device|computer|board|pi} doing{?|}
- {is the pi|is it|is the board} {overheating|too hot|getting hot}{?|}
- how hot is the {cpu|pi|board|processor}{?|}
- {give me|show me} a {system|status|health} {report|overview|check}
- what's my [{metric}](metric){?|}
- [{metric}](metric){?| please| status|}
- {check|run a} {system|health} check
- {is|are} {there|we} enough [{metric}](metric){?|}
- {is|why is} {it|the pi|the system} {so |}{slow|laggy|sluggish}{?|}
- {how long|since when} has {it|the pi|the system} been {running|up|on}{?|}
- {uptime|cpu load|system load|memory usage}{ please|}
- the {pi|board|device|system} is {running hot|burning up|overheating|lagging}
- {check|show me} {the |}{vitals|stats|performance}{ please|}
- {print|display|read out} {the |}[{metric}](metric)
- {my|the pi's} {disk|drive|storage} is {full|almost full|running out}

## Values: metric
- disk space
- disk
- storage
- space left
- cpu
- cpu usage
- processor
- temperature
- temp
- cpu temperature
- memory
- ram
- memory usage
- network
- wifi
- ip address
- ip
- uptime
- performance
- load
- free space

## Values: check
- disk: disk space, storage, storage space, space, space left, free space, sd card, spc, drive → df -h /
- cpu: cpu usage, cpu load, processor, load, perf → uptime && top -bn1 | head -3
- temp: temperature, tmp, cpu temperature, heat → cat /sys/class/thermal/thermal_zone0/temp
- memory: memry, mem, ram, memory usage → free -h
- network: net, wifi, wi-fi, ip, ip addr, ip address, internet, connection → hostname -I && iwgetid -r
- uptime → uptime -p

## Values: sample
- disk → Disk: 9.8 GB free of 29 GB (66% used).
- cpu → CPU: 11% busy, load 0.42 on 4 cores.
- temp → Temperature: 52 °C, well below the 80 °C where the board starts throttling.
- memory → Memory: 1.3 GB used of 3.8 GB.
- network → Network: Wi-Fi connected, IP 192.168.1.42.
- uptime → Uptime: 3 hours 12 minutes.

## Replies
- one: (Simulated)
- all: System overview (simulated values):
