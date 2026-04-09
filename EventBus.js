class EventBusClass {
  constructor() { this._listeners = {}; this._onceListeners = {}; }
  on(event, cb) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(cb);
    return () => this.off(event, cb);
  }
  once(event, cb) {
    if (!this._onceListeners[event]) this._onceListeners[event] = [];
    this._onceListeners[event].push(cb);
    return () => { this._onceListeners[event] = (this._onceListeners[event]||[]).filter(f=>f!==cb); };
  }
  off(event, cb) { if (this._listeners[event]) this._listeners[event] = this._listeners[event].filter(f=>f!==cb); }
  emit(event, data) {
    (this._listeners[event]||[]).forEach(cb=>{try{cb(data);}catch(e){console.error(`EventBus[${event}]:`,e);}});
    (this._onceListeners[event]||[]).forEach(cb=>{try{cb(data);}catch(e){}});
    if((this._onceListeners[event]||[]).length) this._onceListeners[event]=[];
  }
  removeAllListeners(e) { if(e){delete this._listeners[e];delete this._onceListeners[e];}else{this._listeners={};this._onceListeners={};} }
}
export const EVENTS = {
  USER_SIGNED_IN:'user:signed_in',USER_SIGNED_OUT:'user:signed_out',PROFILE_UPDATED:'profile:updated',
  DATA_LOADED:'data:loaded',DATA_REFRESHED:'data:refreshed',OKR_CREATED:'okr:created',
  OKR_UPDATED:'okr:updated',OKR_DELETED:'okr:deleted',KPI_UPDATED:'kpi:updated',
  INITIATIVE_UPDATED:'initiative:updated',NOTIFICATION:'ui:notification',MODAL_OPEN:'ui:modal_open',
  MODAL_CLOSE:'ui:modal_close',SIDEBAR_TOGGLE:'ui:sidebar_toggle',THEME_CHANGED:'ui:theme_changed',
  MODULE_ACTIVATED:'ui:module_activated',AI_REQUEST:'ai:request',AI_RESPONSE:'ai:response',
  AI_ERROR:'ai:error',PAYMENT_STATUS_CHANGED:'payment:status_changed',SUBSCRIPTION_UPDATED:'subscription:updated',
};
const EventBus = new EventBusClass();
export default EventBus;
