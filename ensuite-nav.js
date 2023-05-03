"use strict";(()=>{

  const ensuiteUrl = Object.assign(new URL(location.href), { protocol: 'ws', hash: '' }).href
  console.log('Connecting to reloader at', ensuiteUrl)
  const ensuiteSocket = new WebSocket(ensuiteUrl)
  ensuiteSocket.addEventListener('message', message => {
    switch (message.data) {
      case 'ready':  console.info('Reloader ready'); ensuiteSocket.send('ready'); break;
      case 'reload': console.info('Reloading'); break;
    }
  })

  document.querySelectorAll('a[href]').forEach(async element=>{
    if (element.href.startsWith('mailto:')) return
    try {
      await fetch(element.href, { method: 'HEAD', mode: 'no-cors' })
    } catch (e) {
      console.warn(e)
      element.style.background = 'red'
    }
  })

  document.body.appendChild(Object.assign(document.createElement('nav'), {
    className: 'ensuite-navigator',
    innerHTML: document.querySelector('template[name=ensuite]').innerHTML,
  }))

})()
