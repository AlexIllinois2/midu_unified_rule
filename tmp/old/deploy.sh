#!/usr/bin/env bash

adb push conf/unified_rule.txt /sdcard/Android/data/org.nobody.multitts/files/voice/bytedance/midu/zh-cn/frontend/g2p/mnc/unified_rule.txt
adb shell am force-stop org.nobody.multitts
