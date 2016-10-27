#!/bin/sh
# bootstrap environment for ubuntu 14.04 live usb 

##########################################
# console/terminal setup part

# disable touchpad
synclient TouchpadOff=1

# remap key capslock as control
setxkbmap -layout us -option ctrl:nocaps

##########################################
# system setup part

LIVE_USER=$USER
LIVE_HOME=$HOME

sudo -H sh -c "

# enable universe repository apt get update, install extra packages
add-apt-repository universe && 
apt-get -y update && 
apt-get -y install exuberant-ctags git sshfs docker.io

# fix locale
locale-gen ko-KR.UTF-8
update-locale

# user binary path
if [ -d /media/ubuntu/casper-rw ]
then
  sudo -H mkdir -p /media/ubuntu/casper-rw/data
  sudo -H chown $LIVE_USER:$LIVE_USER /media/ubuntu/casper-rw/data
fi

" # end of sudo -H sh -c

##########################################
# user setup part

export LANG=ko_KR.UTF-8

# user binary path
if [ -d /media/ubuntu/casper-rw ]
then
  sudo -H mkdir -p /media/ubuntu/casper-rw/data
  sudo -H chown $USER:$USER /media/ubuntu/casper-rw/data
  HOME_LOCAL=/media/ubuntu/casper-rw/data/.local
else
  HOME_LOCAL=$HOME/.local
fi

mkdir -p $HOME_LOCAL


# update .bashrc
case :$PATH: in
*:$HOME_LOCAL/bin:*)
  ;;
*)
  cat <<EEE >> ~/.bashrc
export PATH=$HOME_LOCAL/bin:$PATH
alias i='. ~/.ishrc'
EEE
  ;;
esac


# apply to this shell
PATH=$HOME_LOCAL/bin:$PATH
alias i='. ~/.ishrc'


# install default .rcfiles
test -f ~/.ishrc || git clone https://github.com/rhee/_ishrc.git /tmp/_ishrc && ( cd /tmp/_ishrc; sh install.sh )



# python-pip installer
pip(){
  which pip >/dev/null 2>&1 || sudo -H apt-get install python-pip
  unset -f \pip
  \pip "$@"
}

# google-chrome installer
alias google-chrome='(which google-chrome >/dev/null 2>&1 || _install_google_chrome) && unalias google-chrome && \google-chrome'
_install_google_chrome(){
  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo -H apt-key add - 
  echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo -H tee -a /etc/apt/sources.list.d/google-chrome.list
  sudo -H apt-get install google-chrome-stable
}

# microsoft-vscode installer
code(){
  which code >/dev/null 2>&1 || \
    wget "https://go.microsoft.com/fwlink/?LinkID=760868" -O /tmp/vscode.deb && \
    sudo -H dpkg -i /tmp/vscode.deb
  unset -f \code
  \code "$@"
}

# node-js installer ( via node-manager )
npm(){
  which npm >/dev/null 2>&1 || \
    git clone https://github.com/rhee/n.git /tmp/n && \
    ( cd /tmp/n && make PREFIX=$HOME_LOCAL install; $PREFIX/bin/n lts )
  unset -f \npm
  \npm "$@"
}

# sshfs
sshfs(){ 
    \sshfs "$@" -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3
}

#############

set -x

git config --global user.email "shr386+github@hotmail.com"
git config --global user.name "Sang-Hoon RHEE"
