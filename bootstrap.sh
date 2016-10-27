#!/bin/sh
# bootstrap environment for ubuntu 14.04 live usb 

# disable touchpad
synclient TouchpadOff=1

# remap key capslock as control
setxkbmap -layout us -option ctrl:nocaps

# connect to KT_WLAN_9921
echo -n "Enter wifi key:" 1>&2
read wlan_key
nmcli d wifi connect KT_WLAN_9921 password $wlan_key iface wlan0

# enable universe repository apt get update, install extra packages
#sudo -H add-apt-repository universe &&
#sudo -H add-apt-repository multiverse &&
sudo -H apt-get -y update &&
sudo -H apt-get -y install vim-gnome exuberant-ctags git libav-tools python-pip python-virtualenv

# fix locale
sudo -H locale-gen ko-KR.UTF-8
sudo -H update-locale
export LANG=ko_KR.UTF-8

# install node manager
mkdir -p ~/.local/bin ~/.local/etc/profile.d
cat <<EEE >> ~/.bashrc
export PATH=~/.local/bin:$PATH
alias i='. ~/.ishrc'
EEE
. ~/.bashrc
git clone https://github.com/rhee/n.git
(cd ~/n; make PREFIX=~/.local install)
n stable # fetch latest (es2015 supported) node.js

# install default .rcfiles
mkdir -p ~/.local/etc
(cd ~/.local/etc; git clone https://github.com/rhee/_ishrc.git _ishrc; cd _ishrc; sh install.sh)

