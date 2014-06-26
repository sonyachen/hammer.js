function TapRecognizer() {
    Recognizer.apply(this, arguments);

    // previous time and center,
    // used for tap counting
    this.pTime = false;
    this.pCenter = false;

    this._timer = null;
    this._input = null;
    this.count = 0;
}

inherit(TapRecognizer, Recognizer, {
    defaults: {
        event: 'tap',
        pointers: 1,
        taps: 1,
        interval: 300, // max time between the multi-tap taps
        delay: 0, // delay after triggering the tap. useful if you don't want to recognize a tap on each touchend
        time: 250, // max time of the pointer to be down (like finger on the screen)
        movementBetween: 10, // a multi-tap can be a bit off the initial position
        movementWhile: 2 // a minimal movement is ok, but keep it low
    },

    getTouchAction: function() {
        return [TOUCH_ACTION_MANIPULATION];
    },

    process: function(input) {
        var self = this;
        var options = this.options;

        var validPointers = input.pointers.length === options.pointers;
        var validMovement = input.distance < options.movementWhile;
        var validTouchTime = input.deltaTime < options.time;

        // we only allow little movement
        // and we've reached an end event, so a tap is possible
        if (input.eventType & INPUT_END && validMovement && validTouchTime && validPointers) {
            var validInterval = this.pTime ? (input.timeStamp - this.pTime < options.interval) : true;
            var validMultiTap = !this.pCenter || getDistance(this.pCenter, input.center) < options.movementBetween;

            this.pTime = input.timeStamp;
            this.pCenter = input.center;

            if (!validMultiTap || !validInterval) {
                this.count = 1;
            } else {
                this.count += 1;
            }

            this._input = input;
            this.reset();

            // if tap count matches we have recognized it,
            // else it has began recognizing...
            var tapCount = this.count % options.taps;
            if (tapCount === 0) {
                if (!options.delay) {
                    return STATE_RECOGNIZED;
                } else {
                    this._timer = setTimeout(function() {
                        self.state = STATE_RECOGNIZED;
                        self.emit();
                    }, options.delay);
                    return STATE_BEGAN;
                }
            }
            if (!options.delay) {
                return STATE_BEGAN;
            }
        }
        return STATE_FAILED;
    },

    reset: function() {
        clearTimeout(this._timer);
    },

    emit: function() {
        if (this.state == STATE_RECOGNIZED) {
            this._input.tapCount = this.count;
            this.manager.emit(this.options.event, this._input);
        }
    }
});
