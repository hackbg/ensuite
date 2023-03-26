document.querySelectorAll('a[target=content]').forEach(element=>{
  element.addEventListener('click', () => {
    url = new URL(window.location)
    url.searchParams.set('page', new URL(element.href).pathname)
    console.log(element.href)
    history.pushState({}, '', url)
  })
})
