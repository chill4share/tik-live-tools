import { h, render } from 'https://unpkg.com/preact@10.13.2?module';
import { useState, useEffect } from 'https://unpkg.com/preact@10.13.2/hooks/dist/hooks.module.js?module';

function App(){
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState('idle');
  const [comments, setComments] = useState([]);

  useEffect(() => {
    window.electronAPI.onComment((data) => {
      // normalize comment object
      const c = {
        id: Date.now() + Math.random(),
        user: data.uniqueId || (data.user && data.user.uniqueId) || 'anon',
        text: data.comment || data.body || data.message || '',
        ts: new Date().toLocaleTimeString()
      };
      setComments(prev => [c, ...prev].slice(0, 500)); // keep latest 500
    });
    window.electronAPI.onStatus((s) => {
      setStatus(s.status);
    });
  }, []);

  const connect = async () => {
    setStatus('connecting');
    const r = await window.electronAPI.connectTikTok(username);
    if (!r.ok) {
      setStatus('error');
      alert('Connect error: ' + (r.error || 'unknown'));
    }
  };

  const disconnect = async () => {
    await window.electronAPI.disconnectTikTok();
    setStatus('idle');
  };

  return (
    h('div', {}, 
      h('div', {class:'top'},
        h('input', {placeholder:'tên tài khoản (vd: username hoặc @username)', value:username, onInput:e=>setUsername(e.target.value), style:'padding:8px;border-radius:6px;border:1px solid #ddd;flex:1;'}),
        status !== 'connected'
          ? h('button', {onClick:connect, style:'padding:8px 12px;border-radius:6px'}, 'Connect')
          : h('button', {onClick:disconnect, style:'padding:8px 12px;border-radius:6px'}, 'Disconnect'),
        h('div', {style:'min-width:120px;text-align:right;color:#666;padding-left:8px'}, status)
      ),
      h('div', {class:'comments', id:'comments'},
        comments.map(c => 
          h('div', {class:'comment', key:c.id},
            h('div', {class:'avatar'}, ''),
            h('div', {},
              h('div', {class:'name'}, c.user + ' ' , h('span', {class:'meta'}, c.ts)),
              h('div', {}, c.text)
            )
          )
        )
      )
    )
  );
}

render(h(App), document.getElementById('app'));
