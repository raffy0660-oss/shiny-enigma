#!/bin/bash
until grep -q DONE ~/pion/proj7/eng_w2.log 2>/dev/null; do sleep 15; done
rm -f ~/pion/proj7/asm.log
~/pion/proj7/run_all.sh > ~/pion/proj7/run_all.log 2>&1
