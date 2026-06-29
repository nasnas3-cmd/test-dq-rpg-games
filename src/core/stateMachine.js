// stateMachine.js - ゲーム状態の列挙と簡易ステートマシン
export const STATE = {
  TITLE: 'TITLE',
  NAME: 'NAME',
  FIELD: 'FIELD',
  BATTLE: 'BATTLE',
  MENU: 'MENU',
  SHOP: 'SHOP',
  EVENT: 'EVENT',     // メッセージ表示中（移動不可）
  GAMEOVER: 'GAMEOVER',
  ENDING: 'ENDING',
};

export class StateMachine {
  constructor(initial) { this.state = initial; this.prev = null; }
  set(next) { this.prev = this.state; this.state = next; }
  is(s) { return this.state === s; }
}
