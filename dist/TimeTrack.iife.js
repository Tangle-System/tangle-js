var TimeTrack = (function () {
  'use strict';

  class TimeTrack {
    constructor(time) {
      this.memory_ = 0;
      this.paused_ = false;

      if (time) {
        this.setMillis(time);
      } else {
        this.setMillis(0);
      }
    }

    millis() {
      if (this.paused_) {
        return this.memory_;
      } else {
        return Date.now() - this.memory_;
      }
    }

    setMillis(current) {
      this.memory_ = this.paused_ ? current : Date.now() - current;
    }

    setStatus(timestamp, paused) {
      this.paused_ = paused === undefined ? this.paused_ : paused;
      this.memory_ = this.paused_ ? timestamp : Date.now() - timestamp;
    }

    pause() {
      if (!this.paused_) {
        this.paused_ = true;
        this.memory_ = Date.now() - this.memory_;
      }
    }

    unpause() {
      if (this.paused_) {
        this.paused_ = false;
        this.memory_ = Date.now() - this.memory_;
      }
    }

    paused() {
      return this.paused_;
    }
  }

  return TimeTrack;

}());
