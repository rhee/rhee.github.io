#!/bin/sh
# bootstrap environment for ubuntu 14.04 live usb 

##########################################
# system setup part
sudo -H sh -c '

# enable universe repository apt get update, install extra packages
add-apt-repository universe && 
apt-get -y update && 
apt-get -y install vim-gnome exuberant-ctags git sshfs docker.io

# fix locale
locale-gen ko-KR.UTF-8
update-locale
export LANG=ko_KR.UTF-8

' # end of sudo -H sh -c

##########################################
# user setup part

# user binary path
mkdir -p ~/.local/bin

# install node manager
cat <<EEE >> ~/.bashrc
export PATH=~/.local/bin:$PATH
alias i='. ~/.ishrc'
EEE

PATH=~/.local/bin:$PATH
alias i='. ~/.ishrc'



# disable touchpad
synclient TouchpadOff=1

# remap key capslock as control
setxkbmap -layout us -option ctrl:nocaps


# prepare git
git config --global user.email "shr386+github@hotmail.com"
git config --global user.name "Sang-Hoon RHEE"


# install default .rcfiles
git clone https://github.com/rhee/_ishrc.git && ( cd _ishrc; sh install.sh )


# python-pip installer
alias pip='(which pip >/dev/null 2>&1 || _install_python_pip) && unalias pip && pip'
_install_python_pip(){
  sudo -H apt-get install python-pip
}

# google-chrome installer
alias google-chrome='(which google-chrome >/dev/null 2>&1 || _install_google_chrome) && unalias google-chrome && google-chrome'
_install_google_chrome(){
  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo -H apt-key add - 
  echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" | sudo -H tee -a /etc/apt/sources.list.d/google-chrome.list
  sudo -H apt-get install google-chrome-stable
}

# microsoft-vscode installer
alias code='(which code >/dev/null 2>&1 || _install_microsoft_vscode) && unalias code && code'
_install_microsoft_vscode(){
  wget "https://go.microsoft.com/fwlink/?LinkID=760868" -O /tmp/vscode.deb
  sudo -H dpkg -i /tmp/vscode.deb
}


# node-js installer ( via node-manager )
alias node='(which node >/dev/null 2>&1 || _install_node_manager) && unalias node && node'
_install_node_manager(){
  # install n, select es2015-supported latest stable node.js
  git clone https://github.com/rhee/n.git && ( cd ~/n && make PREFIX=~/.local install; hash -r; n stable )
}

alias sshfs=_sshfs_better
_sshfs_better () 
{ 
    sshfs "$@" -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3
}

