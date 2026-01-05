#pragma once
#include <Arduino.h>

class DebouncePin {
public:
    explicit DebouncePin(
        uint8_t pin,
        bool pullup = true,
        unsigned long debounceMs = 20
    );

    bool getValue() const;
    bool didChange();

    void update(); // optional manual update

private:
    uint8_t _pin;
    unsigned long _debounceMs;

    bool _value;        // debounced (stable) value
    bool _lastRaw;      // last raw read
    bool _changed;      // change flag (event)
    unsigned long _lastChangeTime;

    bool readRaw() const;
};
