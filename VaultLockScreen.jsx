import React, { useState, useEffect } from 'react';
const VaultLockScreen = ({ onUnlock, organizationName = 'Xtratia' }) => {
  const [pin, setPin] = useState('');
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const CORRECT_PIN = '0000';
  useEffect(() => {
    let iv;
    if (locked && lockTimer > 0) iv = setInterval(() => setLockTimer(t => { if(t<=1){setLocked(false);return 0;}return t-1;}), 1000);
    return () => clearInterval(iv);
  }, [locked, lockTimer]);
  const handleDigit = (d) => {
    if (locked || pin.length >= 4) return;
    const np = pin + d;
    setPin(np);
    if (np.length === 4) {
      if (np === CORRECT_PIN) { onUnlock?.(); }
      else {
        setShake(true); setTimeout(() => { setShake(false); setPin(''); }, 600);
        const na = attempts + 1; setAttempts(na);
        if (na >= 5) { setLocked(true); setLockTimer(30); setAttempts(0); }
      }
    }
  };
  const btns = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <div style={{position:'fixed',inset:0,zIndex:9999,background:'linear-gradient(135deg,#0f172a,#1e293b)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:"'Plus Jakarta Sans',system-ui,sans-serif"}}>
      <div style={{marginBottom:32,textAlign:'center'}}>
        <div style={{width:64,height:64,borderRadius:16,background:'linear-gradient(135deg,#1E6FFF,#0EA5A0)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',fontSize:28}}>🔐</div>
        <div style={{color:'rgba(255,255,255,0.9)',fontSize:20,fontWeight:700}}>{organizationName}</div>
        <div style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginTop:4}}>Bóveda Estratégica</div>
      </div>
      <div style={{display:'flex',gap:16,marginBottom:32,animation:shake?'shake 0.5s ease':'none'}}>
        {[0,1,2,3].map(i=><div key={i} style={{width:14,height:14,borderRadius:'50%',background:i<pin.length?'#1E6FFF':'transparent',border:`2px solid ${i<pin.length?'#1E6FFF':'rgba(255,255,255,0.3)'}`,transition:'all 0.15s'}}/>)}
      </div>
      {locked&&<div style={{color:'rgba(255,100,100,0.9)',fontSize:14,marginBottom:24}}>Espera {lockTimer}s</div>}
      {!locked&&attempts>0&&<div style={{color:'rgba(255,180,100,0.9)',fontSize:13,marginBottom:16}}>PIN incorrecto ({attempts}/5)</div>}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,72px)',gap:12}}>
        {btns.map((b,i)=>(
          <button key={i} onClick={()=>{if(b==='⌫')setPin(p=>p.slice(0,-1));else if(b)handleDigit(b);}}
            disabled={locked||!b}
            style={{width:72,height:72,borderRadius:12,background:b?'rgba(255,255,255,0.08)':'transparent',border:`1px solid ${b?'rgba(255,255,255,0.1)':'transparent'}`,color:'#fff',fontSize:b==='⌫'?20:22,fontWeight:600,cursor:b?'pointer':'default',opacity:locked?0.4:1}}>
            {b}
          </button>
        ))}
      </div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
};
export default VaultLockScreen;
