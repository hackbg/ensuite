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

  document.querySelectorAll('a[target=content]').forEach(element=>{
    element.addEventListener('click', () => {
      url = new URL(window.location)
      url.searchParams.set('page', new URL(element.href).pathname)
      console.log(element.href)
      history.pushState({}, '', url)
    })
  })

  document.body.appendChild(Object.assign(document.createElement('nav'), {
    className: 'ensuite-navigator',
    innerHTML: document.querySelector('template[name=ensuite]').innerHTML,
  }))

})()
