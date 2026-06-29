// engine.js - requestAnimationFrameループ＋固定タイムステップ更新
export class Engine {
  constructor(update, render) {
    this.update = update;   // (dt, frame) => void
    this.render = render;   // () => void
    this.frame = 0;
    this.last = 0;
    this.acc = 0;
    this.step = 1000 / 60;  // 60fps論理更新
    this.running = false;
    this._loop = this._loop.bind(this);
  }
  start() { this.running = true; this.last = performance.now(); requestAnimationFrame(this._loop); }
  _loop(now) {
    if (!this.running) return;
    let delta = now - this.last; this.last = now;
    if (delta > 100) delta = 100; // スパイク防止
    this.acc += delta;
    let steps = 0;
    while (this.acc >= this.step && steps < 5) {
      this.update(this.step, this.frame);
      this.frame++;
      this.acc -= this.step;
      steps++;
    }
    this.render();
    requestAnimationFrame(this._loop);
  }
}
