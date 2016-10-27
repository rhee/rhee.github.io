#!/bin/sh
# bootstrap environment for ubuntu 14.04 live usb 

##########################################
# system setup part
sudo -H sh -c '

# enable google chrome install
wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - 
echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list

# enable universe repository apt get update, install extra packages
add-apt-repository universe && 
apt-get -y update && 
apt-get -y install vim-gnome exuberant-ctags git python-pip docker

# fix locale
locale-gen ko-KR.UTF-8
update-locale
export LANG=ko_KR.UTF-8

# install vscode
wget "https://go.microsoft.com/fwlink/?LinkID=760868" -O /tmp/vscode.deb
dpkg -i /tmp/vscode.deb


' # end of sudo -H sh -c

##########################################
# user setup part

# user binary path
mkdir -p ~/.local/bin
PATH=~/.local/bin:$PATH
alias i='. ~/.ishrc'


# disable touchpad
synclient TouchpadOff=1

# remap key capslock as control
setxkbmap -layout us -option ctrl:nocaps


# install node manager
cat <<EEE >> ~/.bashrc
export PATH=~/.local/bin:$PATH
alias i='. ~/.ishrc'
EEE


# prepare git
git config --global user.email "shr386+github@hotmail.com"
git config --global user.name "Sang-Hoon RHEE"


# install n, select es2015-supported latest stable node.js
git clone https://github.com/rhee/n.git && ( cd ~/n && make PREFIX=~/.local install; hash -r; n stable )


# install default .rcfiles
git clone https://github.com/rhee/_ishrc.git && ( cd _ishrc; sh install.sh )


