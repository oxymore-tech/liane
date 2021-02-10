#!/usr/bin/env bash

BASEDIR=$(dirname "$0")

OVERRIDE=0
if [[ $1 == "--override" ]]
then
    OVERRIDE=1
fi;

function secretExists() {
    local secret=$1
    
    docker secret inspect ${secret} &> /dev/null
    echo $?
}

function resetSecret() {
    local secret=$1
    local defaultValue=$2
    
    docker secret rm ${secret} &> /dev/null || true
    read -e -p "Enter value for '${secret}' (default value for dev) : " -i "${defaultValue}"
    if [[ ${REPLY} = "" ]]
    then
        printf ${defaultValue} | docker secret create ${secret} - > /dev/null
    else
        printf ${REPLY} | docker secret create ${secret} - > /dev/null
    fi
}

HAS_SECRET=0
for secretLine in $(cat ${BASEDIR}/secrets.default)
do
    if [[ ${secretLine} =~ ^([^=]*)=(.*)$ ]]
    then
        secret="${BASH_REMATCH[1]}"
        defaultValue="${BASH_REMATCH[2]}"
        HAS_SECRET=1
        if [[ $(secretExists ${secret}) == 0 ]]
        then
            if [[ ${OVERRIDE} == 1 ]]
            then
                read -p "Secret '${secret}' already exists. Do you want to override it ? [y/N] " -n 1 -r
                if [[ $REPLY =~ ^[Yy]$ ]]
                then
                    echo
                    resetSecret ${secret} "${defaultValue}"
                fi;
            fi;
        else
            resetSecret ${secret} "${defaultValue}"
        fi;
    fi;
done

if [[ ${HAS_SECRET} == 0 ]]
then
    echo "All secrets already set."
    echo "To override it please run : ./init-secrets.sh --override"
    echo "Warning : application must be stopped to modify an existing secret"
fi;