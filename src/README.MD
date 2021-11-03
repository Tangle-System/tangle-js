## Just a debugging project for development of Tangle BLE connectors for Android and IOS

### !required FW version 0.7.2+

## Steps for testing
1. `Tngl Upload` with timeline reset to 0 should trigger simple transition from BLUE and fadeout to black. If this works, tngl code was parsed successfully
2. event $brigh should control brightness of rainbow animation (percentages event).
3. event $color should control solid color (color event).
4. event $vystb should trigger shoot event with specified color in $vystb event (color event).
5. event $vystd should trigger shoot event for a duration specified in event (in millis). 

- all of these features works on Serial and Bluetooth connection, you can try it on them.
Or play with it by openning file `tangleConnectionTest.tgbl` it in [Tangle Blockly](https://blockly.tangle.cz/0.7.2_beta/).  

