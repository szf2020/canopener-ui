#include "DebouncePin.h"

DebouncePin::DebouncePin(
    uint8_t pin,
    bool pullup,
    unsigned long debounceMs
)
    : _pin(pin),
      _debounceMs(debounceMs),
      _changed(false),
      _lastChangeTime(0)
{
    pinMode(pin, pullup ? INPUT_PULLUP : INPUT);

    _lastRaw = readRaw();
    _value   = _lastRaw;
}

bool DebouncePin::readRaw() const {
    // If using INPUT_PULLUP, LOW = pressed
    return digitalRead(_pin) == HIGH;
}

void DebouncePin::update() {
    bool raw = readRaw();
    unsigned long now = millis();

    if (raw != _lastRaw) {
        _lastRaw = raw;

        if (now - _lastChangeTime >= _debounceMs) {
            if (raw != _value) {
                _value = raw;
                _changed = true;
                _lastChangeTime = now;
            }
        }
    }
}

bool DebouncePin::getValue() const {
    return _value;
}

bool DebouncePin::didChange() {
    update();

    if (_changed) {
        _changed = false;
        return true;
    }
    return false;
}
