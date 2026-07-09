//% weight=100 color=#2b2b2b icon="\uf11b" block="solder:bit Gamepad"
//% groups="['Buttons', 'NeoPixels']"
namespace solderbit_gamepad {
  // Pins setup
  let serialOut = DigitalPin.P0;
  let parallelLoad = DigitalPin.P1;
  let clock = DigitalPin.P2;

  // Constants
  const NUM_BUTTONS = 8;
  const DEBOUNCE_INTERVAL = 50; // Debounce time in milliseconds

  // Variables to track button state and debounce
  let lastButtonStates = 0;
  let lastDebounceTime = control.millis();

  export enum GamepadButton {
    //% block="right trigger"
    RightBumper = 0, // 0b00000001
    //% block="left trigger"
    LeftBumper = 1, // 0b00000010
    //% block="right"
    Right = 2, // 0b00000100
    //% block="up"
    Up = 3, // 0b00001000
    //% block="left"
    Left = 4, // 0b00010000
    //% block="down"
    Down = 5, // 0b00100000
    //% block="Y"
    Y = 6, // 0b01000000
    //% block="X"
    X = 7, // 0b10000000
    //% block="North"
    North = 3,
    //% block="East"
    East = 2,
    //% block="South"
    South = 5,
    //% block="West"
    West = 4
  }

  let strip = neopixel.create(DigitalPin.P1, 5, NeoPixelMode.RGB);
  strip.clear();
  strip.show();

  //% block="Gamepad pixel array"
  //% group="NeoPixels"
  export function solderbitPixels(): neopixel.Strip {
    return strip;
  }

  //% block="is Gamepad button $button pressed"
  //% group="Buttons"
  export function isButtonPressed(button: GamepadButton): boolean {
    let buttonStates = readShiftRegister();
    return (buttonStates & (1 << button)) !== 0;
  }

  function readShiftRegister(): number {
    pins.digitalWritePin(parallelLoad, 0);
    control.waitMicros(5);
    pins.digitalWritePin(parallelLoad, 1);

    let buttonStates = 0;
    for (let i = 0; i < NUM_BUTTONS; i++) {
      pins.digitalWritePin(clock, 0);
      control.waitMicros(2); // Clock pulse width
      if (pins.digitalReadPin(serialOut) === 1) {
        buttonStates |= 1 << (NUM_BUTTONS - 1 - i);
      }
      pins.digitalWritePin(clock, 1);
      control.waitMicros(2); // Ensure clock high time
    }
    return buttonStates;
  }

  // Event handlers storage
  let buttonPressHandlers: { [key: number]: () => void } = {};
  let buttonReleaseHandlers: { [key: number]: () => void } = {};

  //% block="on Gamepad button $button pressed"
  //% group="Buttons"
  export function onButtonPressed(button: GamepadButton, handler: () => void) {
    buttonPressHandlers[button] = handler;
  }

  //% block="on Gamepad button $button released"
  //% group="Buttons"
  export function onButtonReleased(button: GamepadButton, handler: () => void) {
    buttonReleaseHandlers[button] = handler;
  }

  // Monitoring button state changes
  control.inBackground(() => {
    while (true) {
      let currentMillis = control.millis();
      if (currentMillis - lastDebounceTime > DEBOUNCE_INTERVAL) {
        let newButtonStates = readShiftRegister();
        if (newButtonStates !== lastButtonStates) {
          for (let i = 0; i < NUM_BUTTONS; i++) {
            let mask = 1 << i;
            if ((newButtonStates & mask) !== (lastButtonStates & mask)) {
              if ((newButtonStates & mask) !== 0 && buttonPressHandlers[i]) {
                buttonPressHandlers[i]();
              } else if (
                (newButtonStates & mask) === 0 &&
                buttonReleaseHandlers[i]
              ) {
                buttonReleaseHandlers[i]();
              }
            }
          }
          lastButtonStates = newButtonStates;
        }
        lastDebounceTime = currentMillis;
      }
      basic.pause(10);
    }
  });
}
