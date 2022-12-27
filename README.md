# Balena Device Debugging Masterclass

## Prerequisite Classes

This masterclass builds upon knowledge that has been taught in previous classes.
To gain the most from this masterclass, we recommend that you first undertake
the following masterclasses:

- [Balena CLI Masterclass](https://github.com/balena-io/balena-cli-masterclass)
- [BalenaOS Masterclass](https://github.com/balena-io/balenaos-masterclass/)

## Introduction

At balena, we believe the best people to support a customer are the engineers
who build the product. They have the depth and breadth of knowledge that can
quickly identify and track down issues that traditional support agents usually
do not. Not only does this help a customer quickly and efficiently solve most
issues, but it also immerses balena engineers in sections of the product they
might not otherwise encounter in their usual working life, which further
improves the support each engineer can offer. This masterclass has been written
as an initial guide for new engineers about to start support duties.

Whilst the majority of devices never see an issue, occasionally a customer will
contact balena support with a query where one of their devices is exhibiting
anomalous behavior.

Obviously, no guide can cover the range of queries that may occur, but it can
give an insight into how to tackle problems and the most common problems that
a balena support agent sees, as well as some potential solutions to these
problems. In compiling this document, a group of highly seasoned balena
engineers discussed their techniques for discovering and resolving on-device
issues, as well as techniques for determining how best to mitigate an issue
being exhibited.

In this masterclass, you will learn how to:

- Gain access to a customer device, when permission has been granted
- Retrieve initial diagnostics for the device
- Identify and solve common networking problems
- Work with the Supervisor
- Work with balenaEngine
- Examine the Kernel logs
- Understand media-based issues (such as SD card corruption)
- Understand how heartbeat and the VPN only status affects your devices

Whilst this masterclass is intended for new engineers about to start
support duties at balena, it is also intended to act as an item of interest
to customers who wish to know more about how we initially go about debugging
a device (and includes information that customers themselves could use
to give a support agent more information). We recommend, however, ensuring
balena support is _always_ contacted should you have an issue with a device
that is not working correctly.

**Note:** The balena VPN service was renamed to cloudlink in 2022 in customer facing documentation.

## Hardware and Software Requirements

It is assumed that the reader has access to the following:

- A local copy of this repository [Balena Device Debugging Masterclass](https://github.com/balena-io-projects/debugging-masterclass). This copy can be obtained by either method:
  - `git clone https://github.com/balena-io-projects/debugging-masterclass.git`
  - Download ZIP file (from 'Clone or download'->'Download ZIP') and then unzip it to a suitable directory
- A balena supported device, such as a [balenaFin
  1.1](https://store.balena.io/products/balenafin-developer-kit-v1-1-cm3-l), [Raspberry Pi
  3](https://www.raspberrypi.org/products/raspberry-pi-3-model-b/) or [Intel
  NUC](https://www.intel.co.uk/content/www/uk/en/products/boards-kits/nuc.html). If you don't have a device, you can emulate an Intel NUC by
  installing VirtualBox and following [this guide](https://www.balena.io/blog/no-hardware-use-virtualbox/)
- A suitable shell environment for command execution (such as `bash`)
- A [balenaCloud](https://www.balena.io/) account
- A familiarity with [Dockerfiles](https://docs.docker.com/engine/reference/builder/)
- An installed instance of the [balena CLI](https://github.com/balena-io/balena-cli/)

## Exercises

The following exercises assume access to a device that has been provisioned.
As per the other masterclasses in this series we're going to assume that's a
Raspberry Pi 4, however you can simply alter the device type as appropriate in the
following instructions. The balena CLI is going to be used instead of the
WebTerminal in the balenaCloud Dashboard for accessing the device, but all of
the exercises could be completed using the WebTerminal if preferred.

First login to your balena account via `balena login`, and then create a new
fleet:

```shell
$ balena fleet create DebugFleet --type raspberrypi4-64 --organization ryanh
Fleet created: slug "ryanh/debugfleet", device type "raspberrypi4-64"
```

Now provision a device by downloading and flashing a _development_ image from the
Dashboard (via Etcher), or by flashing via the command line.

```shell
$ balena os download raspberrypi4-64 --version "2022.7.0.dev" --output balena-debug.img
Getting device operating system for raspberrypi4-64
balenaOS image version 2022.7.0 downloaded successfully
```

**Note:** Above, we used a [balenaOS Extended Support Release (ESR)](https://www.balena.io/docs/reference/OS/extended-support-release/). These ESRs are currently available for many device types, but only on paid plans and balena team member accounts. If you are going through this masterclass on a free plan, just pick the latest release available and the remainder of the guide is still applicable.

Carry out any configuration generation required, should you be using a Wifi
AP and inject the configuration into the image (see
[balena CLI Advanced Masterclass](https://github.com/balena-io-projects/balena-cli-advanced-masterclass#32-configuring-a-provisioning-image)
for more details), or use a configuration for an ethernet connection:

```shell
$ balena os configure balena-debug.img --fleet DebugFleet --config-network=ethernet
Configuring operating system image
$ balena util available-drives
DEVICE     SIZE    DESCRIPTION
/dev/disk2 31.9 GB TS-RDF5 SD Transcend Media

$ balena os initialize balena-debug.img --type raspberrypi4-64 --drive /dev/disk2 --yes
Initializing device

Note: Initializing the device may ask for administrative permissions
because we need to access the raw devices directly.
Going to erase /dev/disk2.
Admin privileges required: you may be asked for your computer password to continue.
Writing Device OS [========================] 100% eta 0s
Validating Device OS [========================] 100% eta 0s
You can safely remove /dev/disk2 now
```

You should now have a device that will appear as part of the DebugFleet fleet:

```shell
$ balena devices | grep debugfleet
7830516 9294512 average-fire  raspberrypi4-64   debugfleet       Idle   true      14.0.8             balenaOS 2022.7.0 https://dashboard.balena-cloud.com/devices/92945128a17b352b155c2ae799791389/summary
```

For convenience, export a variable to point to the root of this masterclass
repository, as we'll use this for the rest of the exercises, eg:

```shell
$ export BALENA_DEBUGGING_MASTERCLASS=~/debugging-masterclass
```

Finally, push the code in the `multicontainer-app` directory to the fleet:

```shell
$ cd $BALENA_DEBUGGING_MASTERCLASS/multicontainer-app
$ balena push DebugFleet
```

### 1. Accessing a User Device

{{>"masterclass/debugging/access-device"}}

#### 1.1 Granting Support Access to a Support Agent

{{>"masterclass/debugging/support-access-device"}}

### 2. Initial Diagnosis

{{>"masterclass/debugging/initial-diagnosis"}}

#### 2.1 Device Health Checks

This will trigger a set of [health checks](https://www.balena.io/docs/reference/diagnostics/) to run on the device, and you should see the all the checks as `Succeeded` in the Success column. This shows that the device is healthy and there are no obvious faults. 

That's no fun, let's create one a fault

SSH into your device, via `balena ssh <UUID>`, using the appropriate UUID. We want to
SSH into the host OS, as that's where we'll wreak havoc:

```shell
$ balena ssh 9294512
=============================================================
    Welcome to balenaOS
=============================================================
root@9294512:~#
```

We're going to do a couple of things that will show up as problems. Something
you'll often check, and that we'll discuss later, is the state of the balena
Supervisor and balenaEngine.

First of all, we're going to kill the balenaEngine maliciously without letting
it shut down properly:

```shell
root@9294512:~# ps aux | awk '!/awk/ && /balenad/ {print $2}' | xargs kill -9
```

What this does is list the processes running, look for the `balenad` executable
(the balenaEngine itself) and then stop the engine with a `SIGKILL` signal,
which will make it immediately terminate instead of shutting down correctly.
In fact, we'll do it twice. Once you've waited about 30 seconds, run the command
again.

Now if you run the health checks again. After a couple minutes, you'll see the 'check_container_engine`
section has changed:

| Check                  | Status | Notes                                                                                                                                               |
| ---------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| check_container_engine | Failed | Some container_engine issues detected:                                                                                                              |
|                        |        | test_container_engine_running_now Container engine balena is NOT running                                                                            |
|                        |        | test_container_engine_restarts Container engine balena has 2 restarts and may be crashlooping (most recent start time: Thu 2022-08-18 11:14:32 UTC) |
|                        |        | test_container_engine_responding Error querying container engine:                                                                                   |

Unclean restarts usually mean that the engine crashed abnormally with an issue.
This usually happens when something catastrophic occurs between the Supervisor
and balenaEngine or corruption occurs in the image/container/volume store.
Let's take a look at the journal for balenaEngine (`balena.service`) on the
device:

```shell
root@9294512:~# journalctl --no-pager -n 400 -u balena.service
```

You'll see a _lot_ of output, as the logs don't just show the balenaEngine
output but the output from the Supervisor as well. However, if you search
through the output, you'll see a line like the following:

```shell
Aug 18 11:14:32 9294512 systemd[1]: balena.service: Main process exited, code=killed, status=9/KILL
```

As you can see, the `balena.service` was killed with a `SIGKILL` instruction.

You can also see the two times that our services were attempted to start after the engine was killed and restarted automatically by running:

```shell
root@7db55ce:~# journalctl --no-pager -n 400 -u balena.service | grep frontend -A 5
...
Aug 18 11:15:05 9294512 89fe7a71a40d[6061]: > frontend@1.0.0 start /usr/src/app
Aug 18 11:15:05 9294512 89fe7a71a40d[6061]: > node index.js
Aug 18 11:15:05 9294512 89fe7a71a40d[6061]:
Aug 18 11:15:06 9294512 422820756f15[6061]:
Aug 18 11:15:06 9294512 422820756f15[6061]: > backend@1.0.0 start /usr/src/app
Aug 18 11:15:06 9294512 422820756f15[6061]: > node index.js
```

As you can see, these have now been specifically output for the two running
service containers.

If you _only_ want to see balenaEngine output and not from any of the service
containers it is running, use `journalctl -u balena.service -t balenad`. The
`-t` is the shortened form of `--identifier=<id>`, which in this case ensures
that only messages from the `balenad` syslog identifier are shown.

We'll discuss issues with balenaEngine and the Supervisor later in this masterclass.

There are many other health checks that can immediately expose a problem.
For example, warnings on low free memory or disk space can expose problems which
will exhibit themselves as release updates failing to download, or service
containers restarting abnormally (especially if a service runs
unchecked and consumes memory until none is left). We'll also go through some
of these scenarios later in this masterclass.

#### 2.2 Device Diagnostics

{{>"masterclass/debugging/device-diagnostics"}}

Whilst we won't go into this here, the following exercises will all
deal with issues where the diagnostics will show abnormalities when examined.

#### 2.3 Supervisor State

{{>"masterclass/debugging/supervisor-state"}}

### 3. Device Access Responsibilities

When accessing a customer's device you have a number of responsibilities, both
technically and ethically. A customer assumes that the support agent has a level
of understanding and competence, and as such support agents should ensure that
these levels are met successfully.

There are some key points which should be followed to ensure that we are never
destructive when supporting a customer:

- Always ask permission before carrying out non-read actions. This includes
  situations such as stopping/restarting/starting services which are otherwise
  functional (such as the Supervisor). This is _especially_ important in cases
  where this would stop otherwise functioning services (such as stopping
  balenaEngine).
- Ensure that the customer is appraised of any non-trivial non-read actions that
  you are going to take before you carry those actions out on-device. If they
  have given you permission to do 'whatever it takes' to get the device
  running again, you should still pre-empt your actions by communicating this
  clearly.
- During the course of carrying out non-read actions on a device, should the
  customer be required to answer a query before being able to proceed, make it
  clear to them what you have already carried out, and that you need a
  response before continuing. Additionally ensure that any incoming agents
  that may need to access the device have all of your notes and actions up
  to this point, so they can take over in your stead.
- _Never_ reboot a device without permission, especially in cases where it
  appears that there is a chance that the device will not recover (which may
  be the case in situations where the networking is a non-optimal state). It
  is imperative in these cases that the customer is made aware that this could
  be an outcome in advance, and that they must explicitly give permission for
  a reboot to be carried out.

Occasionally it becomes very useful to copy files off from a device, so that
they can be shared with the team. This might be logfiles, or the Supervisor
database, etc.

A quick way of copying data from a device with a known UUID onto a local machine
is to use SSH with your balena support username:

```shell
ssh -o LogLevel=ERROR -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 22 ${USER}@ssh.balena-devices.com host -s ${UUID} 'cat ${PATH_TO_FILE}' > ${LOCAL_PATH}
```

You can copy data from your local machine onto a device by piping the file in
instead:

```shell
ssh -o LogLevel=ERROR -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -p 22 ${USER}@ssh.balena-devices.com host -s ${UUID} 'cat > ${PATH_TO_FILE}' < ${LOCAL_PATH}
```

#### 4. Accessing a Device using a Gateway Device

{{>"masterclass/debugging/device-gateway"}}

### 5. Component Checklist

The key to any support is context. As a support agent, you should have enough
context from a customer to start an investigation. If you do not, then you
should ask for as much context and detail about the device as you can before
starting an investigation on the device.

When accessing a device, there are usually some things you can check to see why
a device may be in a broken state. Obviously, this depends on the
symptoms a customer has reported, as well as those a support agent may have
found when running the device diagnostics. However, there are some common
issues that can occur to put a device into a broken state that can be
quickly fixed.

The following sections discuss some of the first components to check when
carrying out on-device support. The components that should be checked
and in what order comes down to the context of support, and the symptoms seen.

#### 5.1 Service Status and Journal Logs

balenaOS uses [systemd](https://www.freedesktop.org/wiki/Software/systemd/) as
its [init system](https://en.wikipedia.org/wiki/Init), and as such almost all
the fundamental components in balenaOS run as systemd services. systemd builds
a dependency graph of all of its unit files (in which services are defined) to
determine the order that these should be started/shutdown in. This is
generated when systemd is run, although there are ways to rebuild this after
startup and during normal system execution.

Possibly the most important command is `journalctl`, which allows you to read
the service's journal entries. This takes a variety of switches, the most
useful being:

- `--follow`/`-f` - Continues displaying journal entries until the command is halted
  (eg. with Ctrl-C)
- `--unit=<unitFile>`/`-u <unitFile>` - Specifies the unit file to read journal
  entries for. Without this, all units entries are read.
- `--pager-end`/`-e` - Jump straight to the final entries for a unit.
- `--all`/`-a` - Show all entries, even if long or with unprintable
  characters. This is especially useful for displaying the service container
  logs from user containers when applied to `balena.service`.

A typical example of using `journalctl` might be following a service to see
what's occuring. Here's it for the Supervisor, following journal entries in
real time:

```shell
root@9294512:~# journalctl --follow --unit=balena-supervisor
-- Journal begins at Fri 2021-08-06 14:40:59 UTC. --
Aug 18 16:56:55 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 16:57:05 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 16:58:17 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 16:58:27 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 16:58:37 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 16:58:48 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 16:58:58 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 16:59:19 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 16:59:40 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
Aug 18 17:00:00 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
```

Any systemd service can be referenced in the same way, and there are some common
commands that can be used with services:

- `systemctl status <serviceName>` - Will show the status of a service. This
  includes whether it is currently loaded and/or enabled, if it is currently
  active (running) and when it was started, its PID, how much memory it is
  notionally (and beware here, this isn't always the amount of physical
  memory) using, the command used to run it and finally the last set of
  entries in its journal log. Here's example output from the OpenVPN service:

  ```shell
  root@9294512:~# journalctl --follow --unit=balena-supervisor
  -- Journal begins at Fri 2021-08-06 14:40:59 UTC. --
  Aug 18 16:56:55 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 16:57:05 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 16:58:17 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 16:58:27 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 16:58:37 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 16:58:48 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 16:58:58 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 16:59:19 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 16:59:40 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 17:00:00 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 17:00:11 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 17:00:31 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 17:00:42 9294512 balena-supervisor[6890]: [info]    Reported current state to the cloud
  Aug 18 17:00:49 9294512 balena-supervisor[6890]: [api]     GET /v1/healthy 200 - 3.272 ms
  ```

- `systemctl start <serviceName>` - Will start a non-running service. Note that
  this will _not_ restart a service that is already running.
- `systemctl stop <serviceName>` - Will stop a running service. If the service
  is not running, this command will not do anything.
- `systemctl restart <serviceName>` - Will restart a running service. If the
  service is not running, this will start it.
- `systemctl daemon-reload` - Will essentially run through the startup process
  systemd carries out at initialisation, but without restarting services or
  units. This allows the rebuild of the system dependency graph, and should be
  carried out if any of the unit files are changed whilst the system is
  running.

This last command may sound a bit confusing but consider the following. Imagine
that you need to dynamically change the `balena-supervisor.service` unit file
to increase the healthcheck timeout on a very slow system. Once that change has
been made, you'll want to restart the service. However, first, you need to
reload the unit file as this has changed from the loaded version. To do this,
you'll run `systemctl daemon-reload` and then
`systemctl restart balena-supervisor.service` to restart the Supervisor.

In general, there are some core services that need to execute for a device to
come online, connect to the balenaCloud VPN, download releases and then run
them:

- `chronyd.service` - Responsible for NTP duties and syncing 'real' network
  time to the device. Note that balenaOS versions less than v2.13.0 used
  `systemd-timesyncd.service` as their NTP service, although inspecting it is
  very similar to that of `chronyd.service`.
- `dnsmasq.service` - The local DNS service which is used for all host OS
  lookups (and is the repeater for user service containers by default).
- `NetworkManager.service` - The underlying Network Manager service, ensuring
  that configured connections are used for networking.
- `os-config.service` - Retrieves settings and configs from the API endpoint,
  including certificates, authorized keys, the VPN config, etc.
- `openvpn.service` - The VPN service itself, which connects to the balenaCloud
  VPN, allowing a device to come online (and to be SSHd to and have actions
  performed on it). Note that in balenaOS versions less than v2.10.0 this
  was called `openvpn-resin.service`, but the method for inspecting and
  dealing with the service is the same.
- `balena.service` - The balenaEngine service, the modified Docker daemon fork
  that allows the management and running of service images,
  containers, volumes and networking.
- `balena-supervisor.service` - The {{ $names.company.short }} Supervisor service,
  responsible for the management of releases, including downloading updates of the app and
  self-healing (via monitoring), variables (fleet/device), and exposure of these
  services to containers via an API endpoint.
- `dbus.service` - The DBus daemon socket can be used by services if the
  `io.balena.features.dbus` label is applied. This exposes the DBus daemon
  socket in the container which allows the service to control several
  host OS features, including the Network Manager.

Additionally, there are some utility services that, whilst not required
for a barebones operation, are also useful:

- `ModemManager.service` - Deals with non-Ethernet or Wifi devices, such as
  LTE/GSM modems.
- `avahi-daemon.service` - Used to broadcast the device's local hostname
  (useful in development mode, responds to `balena scan`).

We'll go into several of these services in the following sections, but generally
these are the first points to examine if a system is not behaving as it should,
as most issues will be associated with these services.

Additionally there are a large number of utility services that facilitate the
services above, such as those to mount the correct partitions for data storage,
configuring the Supervisor and running it should it crash, etc.

#### 5.2 Persistent Logs

{{>"masterclass/debugging/device-logs"}}

### 6. Determining Networking Issues

{{>"masterclass/debugging/network"}}

### 7. Working with the `config.json` File

{{>"masterclass/debugging/configuration"}}

### 8. Working with the Supervisor

{{>"masterclass/debugging/supervisor-debugging"}}

### 9. Working with balenaEngine

{{>"masterclass/debugging/balenaengine-debugging"}}

### 10. Using the Kernel Logs

There are occasionally instances where a problem arises which is not immediately
obvious. In these cases, you might see services fail 'randomly', perhaps
attached devices don't behave as they should, or maybe spurious reboots occur.

If an issue isn't apparent fairly soon after looking at a device, the
examination of the kernel logs can be a useful check to see if anything is
causing an issue.

To examine the kernel log on-device, simply run `dmesg` from the host OS:

```shell
root@debug-device:~# dmesg
[    0.000000] Booting Linux on physical CPU 0x0000000000 [0x410fd083]
[    0.000000] Linux version 5.10.95-v8 (oe-user@oe-host) (aarch64-poky-linux-gcc (GCC) 11.2.0, GNU ld (GNU Binutils) 2.37.20210721) #1 SMP PREEMPT Thu Feb 17 11:43:01 UTC 2022
[    0.000000] random: fast init done
[    0.000000] Machine model: Raspberry Pi 4 Model B Rev 1.2
[    0.000000] efi: UEFI not found.
[    0.000000] Reserved memory: created CMA memory pool at 0x000000001ac00000, size 320 MiB
[    0.000000] OF: reserved mem: initialized node linux,cma, compatible id shared-dma-pool
[    0.000000] Zone ranges:
[    0.000000]   DMA      [mem 0x0000000000000000-0x000000003fffffff]
[    0.000000]   DMA32    [mem 0x0000000040000000-0x000000007fffffff]
[    0.000000]   Normal   empty
[    0.000000] Movable zone start for each node
[    0.000000] Early memory node ranges
[    0.000000]   node   0: [mem 0x0000000000000000-0x000000003e5fffff]
[    0.000000]   node   0: [mem 0x0000000040000000-0x000000007fffffff]
[    0.000000] Initmem setup node 0 [mem 0x0000000000000000-0x000000007fffffff]
[    0.000000] On node 0 totalpages: 517632
[    0.000000]   DMA zone: 4096 pages used for memmap
[    0.000000]   DMA zone: 0 pages reserved
[    0.000000]   DMA zone: 255488 pages, LIFO batch:63
[    0.000000]   DMA32 zone: 4096 pages used for memmap
[    0.000000]   DMA32 zone: 262144 pages, LIFO batch:63
[    0.000000] On node 0, zone DMA32: 512 pages in unavailable ranges
[    0.000000] percpu: Embedded 32 pages/cpu s92376 r8192 d30504 u131072
[    0.000000] pcpu-alloc: s92376 r8192 d30504 u131072 alloc=32*4096
[    0.000000] pcpu-alloc: [0] 0 [0] 1 [0] 2 [0] 3
[    0.000000] Detected PIPT I-cache on CPU0
[    0.000000] CPU features: detected: Spectre-v2
[    0.000000] CPU features: detected: Spectre-v4
[    0.000000] CPU features: detected: ARM errata 1165522, 1319367, or 1530923
[    0.000000] Built 1 zonelists, mobility grouping on.  Total pages: 509440
[    0.000000] Kernel command line: coherent_pool=1M 8250.nr_uarts=0 snd_bcm2835.enable_compat_alsa=0 snd_bcm2835.enable_hdmi=1  smsc95xx.macaddr=DC:A6:32:9E:18:DD vc_mem.mem_base=0x3f000000 vc_mem.mem_size=0x3f600000  dwc_otg.lpm_enable=0 rootfstype=ext4 rootwait dwc_otg.lpm_enable=0 rootwait vt.global_cursor_default=0 console=null cgroup_enable=memory root=UUID=ba1eadef-20c9-4504-91f4-275265fa5dbf rootwait
[    0.000000] cgroup: Enabling memory control group subsystem
[    0.000000] Dentry cache hash table entries: 262144 (order: 9, 2097152 bytes, linear)
[    0.000000] Inode-cache hash table entries: 131072 (order: 8, 1048576 bytes, linear)
[    0.000000] mem auto-init: stack:off, heap alloc:off, heap free:off
[    0.000000] software IO TLB: mapped [mem 0x000000003a600000-0x000000003e600000] (64MB)
[    0.000000] Memory: 1602680K/2070528K available (11392K kernel code, 2022K rwdata, 4460K rodata, 14208K init, 1284K bss, 140168K reserved, 327680K cma-reserved)
[    0.000000] SLUB: HWalign=64, Order=0-3, MinObjects=0, CPUs=4, Nodes=1
[    0.000000] ftrace: allocating 44248 entries in 173 pages
[    0.000000] ftrace: allocated 173 pages with 5 groups
[    0.000000] rcu: Preemptible hierarchical RCU implementation.
[    0.000000] rcu: 	RCU event tracing is enabled.
[    0.000000] rcu: 	RCU restricting CPUs from NR_CPUS=256 to nr_cpu_ids=4.
[    0.000000] 	Trampoline variant of Tasks RCU enabled.
[    0.000000] 	Rude variant of Tasks RCU enabled.
[    0.000000] 	Tracing variant of Tasks RCU enabled.
[    0.000000] rcu: RCU calculated value of scheduler-enlistment delay is 25 jiffies.
[    0.000000] rcu: Adjusting geometry for rcu_fanout_leaf=16, nr_cpu_ids=4
[    0.000000] NR_IRQS: 64, nr_irqs: 64, preallocated irqs: 0
[    0.000000] GIC: Using split EOI/Deactivate mode
[    0.000000] irq_brcmstb_l2: registered L2 intc (/soc/interrupt-controller@7ef00100, parent irq: 10)
[    0.000000] random: get_random_bytes called from start_kernel+0x3a4/0x570 with crng_init=1
[    0.000000] arch_timer: cp15 timer(s) running at 54.00MHz (phys).
[    0.000000] clocksource: arch_sys_counter: mask: 0xffffffffffffff max_cycles: 0xc743ce346, max_idle_ns: 440795203123 ns
[    0.000007] sched_clock: 56 bits at 54MHz, resolution 18ns, wraps every 4398046511102ns
[    0.000332] Console: color dummy device 80x25
[    0.000405] Calibrating delay loop (skipped), value calculated using timer frequency.. 108.00 BogoMIPS (lpj=216000)
[    0.000443] pid_max: default: 32768 minimum: 301
[    0.000643] LSM: Security Framework initializing
[    0.000891] Mount-cache hash table entries: 4096 (order: 3, 32768 bytes, linear)
[    0.000939] Mountpoint-cache hash table entries: 4096 (order: 3, 32768 bytes, linear)
...
```

The rest of the output is truncated here. Note that the time output is in
seconds. If you want to display a human readable time, use the `-T` switch.
This will, however, strip the nanosecond accuracy and revert to chronological
order with a minimum granularity of a second.

Note that the 'Device Diagnostics' tab from the 'Diagnostics' section of a
device also runs `dmesg -T` and will display these in the output window.
However, due to the sheer amount of information presented here, it's sometimes
easier to run it on-device.

Some common issues to watch for include:

- Under-voltage warnings, signifying that a device is not receiving what it
  requires from the power supply to operate correctly (these warnings
  are only present on the Raspberry Pi series).
- Block device warnings, which could signify issues with the media that balenaOS
  is running from (for example, SD card corruption).
- Device detection problems, where devices that are expected to show in the
  device node list are either incorrectly detected or misdetected.

### 11. Media Issues

Sometimes issues occur with the media being used (the medium that balenaOS
and all other data is stored on, for example an SD card or eMMC drive).

This can include multiple issues, but the most common are that of exhaustion
of free space on a device, or that of SD card corruption.

#### 11.1 Out of Space Issues

A media partition that is full can cause issues such as the following:

- Failure to download release updates, or failure to start new/updated
  services after a download has occurred
- Failure for a service to store data into defined volumes
- Failure of services to start up (mostly those that need to store data that
  isn't in `tmpfs`)

Determining how much space is left on the media for a device can be achieved by
logging into the host OS and running:

```shell
root@debug-device:~# df -h
Filesystem                      Size  Used Avail Use% Mounted on
devtmpfs                        783M     0  783M   0% /dev
tmpfs                           950M  5.3M  945M   1% /run
/dev/mmcblk0p2                  300M  276M  4.5M  99% /mnt/sysroot/active
/dev/disk/by-state/resin-state   18M   75K   16M   1% /mnt/state
overlay                         300M  276M  4.5M  99% /
/dev/mmcblk0p6                   29G  367M   27G   2% /mnt/data
tmpfs                           950M     0  950M   0% /dev/shm
tmpfs                           4.0M     0  4.0M   0% /sys/fs/cgroup
tmpfs                           950M     0  950M   0% /tmp
tmpfs                           950M   40K  950M   1% /var/volatile
/dev/mmcblk0p1                   40M  7.2M   33M  19% /mnt/boot
/dev/mmcblk0p3                  300M   14K  280M   1% /mnt/sysroot/inactive
```

The `-h` switch makes the figures returned 'human readable'. Without this switch
the returned figures will be in block sizes (usually 1k or 512byte blocks).

The two main mounts where full space problems commonly occur are `/mnt/data` and
`/mnt/state`. The former is the data partition where all service images, containers
and volumes are stored. The latter is the state partition, where overlays for the
root FS (such as user defined network configuraions) and the permanent logs
are stored.

There are a few ways to try and relieve out of space issues on a media drive.

##### 11.1.1 Image and Container Pruning

One fairly easy cleanup routine to perform is that of pruning the Docker tree
so that any unused images, containers, networks and volumes are removed. It
should be noted that in the day-to-day operation of the Supervisor, it attempts
to ensure that anything that is no longer used on the device _is_ removed when
not required. However, there are issues that sometimes occur that can cause this
behavior to not work correctly. In these cases, a prune should help clean
anything that should not be present:

```shell
root@debug-device:~# balena system prune -a -f --volumes
Deleted Images:
untagged: balena-healthcheck-image:latest
deleted: sha256:46331d942d6350436f64e614d75725f6de3bb5c63e266e236e04389820a234c4
deleted: sha256:efb53921da3394806160641b72a2cbd34ca1a9a8345ac670a85a04ad3d0e3507
untagged: balena_supervisor:v14.0.8

Total reclaimed space: 9.136kB
```

Note that in the above, _all_ unused images, containers, networks and volumes
will be removed. To just remove dangling images, you can use
`balena system prune -a`.

##### 11.1.2 Customer Data

Occasionally, customer volumes can also fill up the data partition. This
obviously causes more issues, because usually this is data that cannot just
be deleted. In these cases, it's imperative that the customer is informed that
they've filled the data partition and that appropriate pruning is required.
Filling disk space does not tend to stop access to devices, so in these cases
customers should be asked to enter the relevant services and manually prune
data.

Before discussion on persistent data, it's worth noting that occasionally
customer apps store data to the service container instead of a
persistent data volume. Sometimes, this data is intended as temporary, so doing
so is not an issue (although if they are doing so and expecting it to stay
permanent, this will not occur as service container rebuilds will remove the
layers where new data is stored). However there are cases where even this
temporary data can be so large that it fills the storage media. In these cases,
the Supervisor can be stopped, and then the service container affected, allowing
that container to be removed so the Supervisor can rebuild from the service
image. This will remove the layers filling the space. Care should be taken
and customers informed first, in case this data is required. They should also
be informed of persistent data and how to use it.

Because persistent data is stored as volumes, it's also possible to prune data
for a service from within the host OS. For example, should a service be filling
a volume so quickly as to prevent sensible data removal, an option is to stop
that service and then manually remove data from the service's volume.

Data volumes are always located in the `/var/lib/docker/volumes` directory. Care
needs to be taken to ensure the right volumes are examine/pruned of data, as
not all volumes pertain directly to customer data. Let's list the volumes:

```shell
root@debug-device:~# ls -l /var/lib/docker/volumes/
total 28
drwx-----x 3 root root  4096 Aug 19 19:15 1958513_backend-data
-rw------- 1 root root 32768 Aug 19 19:15 metadata.db
```

In single service apps, the relevant data volume is suffixed with the
`_balena-data` string.

In multicontainer apps, the suffix always corresponds with the name
of the bound volume. For example, let's look at the docker-compose manifest
for the `multicontainer-app` app used in this debugging masterclass:

```yaml
version: '2.1'
volumes:
  backend-data: {}
services:
  frontend:
    build: ./frontend
    network_mode: host
  backend:
    build: ./backend
    labels:
      io.balena.features.supervisor-api: '1'
      io.balena.features.balena-api: '1'
    privileged: true
    volumes:
      - 'backend-data:/mydata'
```

As you can see, a `backend-data` volume is defined, and then used by the
`backend` service. Assuming your device is still running the multicontainer
app for this masterclass, SSH into the device, and then examine the
running services:

```shell
root@debug-device:~# balena ps
CONTAINER ID   IMAGE                                                            COMMAND                  CREATED              STATUS                    PORTS     NAMES
330d34540489   3128dae78199                                                     "/usr/bin/entry.sh n…"   About a minute ago   Up About a minute                   backend_5302053_2266082_28d1b0e8e99c2ae6b7361f3b0f835f5c
2e2a7fcfe6f6   f0735c857f39                                                     "/usr/bin/entry.sh n…"   57 minutes ago       Up 16 minutes                       frontend_5302052_2266082_28d1b0e8e99c2ae6b7361f3b0f835f5c
e593ab6439fe   registry2.balena-cloud.com/v2/04a158f884a537fc1bd11f2af797676a   "/usr/src/app/entry.…"   57 minutes ago       Up 16 minutes (healthy)             balena_supervisor
root@debug-device:~# balena inspect backend_5302053_2266082_28d1b0e8e99c2ae6b7361f3b0f835f5c | grep /var/lib/docker/volumes
                "Source": "/var/lib/docker/volumes/1958513_backend-data/_data",
```

The volume is denoted with the suffix of the defined volume name.
Should there be multiple volumes, then appropriate directories for these will
be created in the `/var/lib/docker/volumes` directory, with the relevant
suffixes.

Knowing this, it becomes fairly simple to stop services that have filled volumes
and to clear these out:

1. Stop the Supervisor and start timer (`balena-supervisor.service` and
   `update-balena-supervisor.timer`).
2. Determine the relevant data directories for the volumes filling the data
   partition.
3. Clean them appropriately.
4. Restart the Supervisor and start timer.

#### 11.2 Storage Media Corruption

Many device types use storage media that has high wear levels. This includes
devices such as the Raspberry Pi series, where SD cards are the usual storage
media. Because we recommend very hard-wearing cards (the SanDisk Extreme Pro
family are extremely resilient), we don't regularly have issues with customer devices
dying due to SD card failure. However, they do occur (and not just on SD cards,
any type of flash memory based storage includes a shorter lifespan compared to
media such as platter drives). Initially, media corruption and wearing exhibit
'random' signs, including but not limited to:

- Release updates failing to download/start/stop.
- Services suddenly restarting.
- Devices not being mapped to device nodes.
- Extreme lag when interacting with services/utilities from the CLI.
- Spurious kernel errors.

In fact, media corruption could potentially exhibit as _any_ sort of issue,
because there's (generally) no way to determine where wearing may exhibit
itself. Additionally, we have seen issues where media write/reads take so
long that they also adversely impact the system (for example, healthchecks
may take too long to occur, which could potentially restart services including
the Supervisor and balenaEngine), in these cases swapping the media for a
known, working brand has caused this issues to be resolved.

One quick check that can be carried out is the root filing system integrity
check. This checks the MD5 hashes fingerprints of all the files in the filing
system against those when they were built. This tends to give an idea of
whether corruption may be an issue (but it certainly isn't guaranteed).
SSH into your device and run the following:

```shell
root@debug-device:~# grep -v "/var/cache/ldconfig/aux-cache" /balenaos.fingerprint | md5sum --quiet -c -
```

If the check returns successfully, none of the files differ in their MD5
fingerprints from when they were built.

Generally, if it appears that media corruption may be an issue, we generally
check with customers if they're running a recommended media brand, and if
not ask them to do so.

Should the worst happen and a device is no longer bootable due to filesystem
corruption, they still have the option of recovering data from the device.
In this case, they'll need to remove the media (SD card, HDD, etc.) from the
device and then follow appropriate instructions.

### 12. Device connectivity status

{{>"masterclass/debugging/device-connectivity"}}


## Conclusion

In this masterclass, you've learned how to deal with balena devices as a
support agent. You should now be confident enough to:

- Request access from a customer and access their device, including 'offline'
  devices on the same network as one that is 'online'.
- Run diagnostics checks and understand their results.
- Understand the core balenaOS services that make up the system, including
  the ability to read journals from those services, as well as stopping,
  starting and restarting them.
- Enable persistent logs, and then examine them when required.
- Diagnose and handle a variety of network issues.
- Understand and work with the `config.json` configuration file.
- Understand the Supervisor's role, including key concepts.
- Understand the balenaEngine's role, including key concepts.
- Be able to look at kernel logs, and determine some common faults.
- Work with media issues, including dealing with full media, working with customer data, and diagnosing corruption issues.
- Understand why your device's status is Online (Heartbeat Only) or Online (VPN Only) and how it can be impacting your app.
