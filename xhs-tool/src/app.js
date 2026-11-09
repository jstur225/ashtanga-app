(function () {
  'use strict'

  const payload = window.__ASHTANGA_POSE_DATA__
  if (!payload || !Array.isArray(payload.poses)) {
    document.body.innerHTML = '<p class="fatal-error">体式数据加载失败，请重新构建小工具。</p>'
    return
  }

  const sectionLabels = {
    sun: '拜日 A/B',
    standing: '站立体式',
    seated: '坐立体式',
    rest: '休息体式',
  }

  const state = {
    activeSection: 'sun',
    query: '',
    visiblePoses: [],
    selectedIndex: -1,
    savedScrollY: 0,
  }

  const elements = {
    search: document.querySelector('#pose-search'),
    clearSearch: document.querySelector('.clear-search'),
    resetSearch: document.querySelector('.reset-search'),
    resultSummary: document.querySelector('.result-summary'),
    grid: document.querySelector('.pose-grid'),
    empty: document.querySelector('.empty-state'),
    navButtons: Array.from(document.querySelectorAll('[data-section]')),
    searchSticky: document.querySelector('.search-sticky'),
    sentinel: document.querySelector('.sticky-sentinel'),
    detail: document.querySelector('.pose-detail'),
    detailScroll: document.querySelector('.detail-scroll'),
    detailImage: document.querySelector('.detail-image'),
    detailPlaceholder: document.querySelector('.detail-image-placeholder'),
    detailName: document.querySelector('#detail-name'),
    detailCueName: document.querySelector('.detail-cue-name'),
    detailMetadata: document.querySelector('.detail-metadata'),
    detailVinyasaItem: document.querySelector('.detail-vinyasa-item'),
    detailVinyasaCount: document.querySelector('.detail-vinyasa-count'),
    detailDrishti: document.querySelector('.detail-drishti'),
    detailDrishtiSanskrit: document.querySelector('.detail-drishti-sanskrit'),
    detailSteps: document.querySelector('.detail-steps'),
    detailStepsHint: document.querySelector('.detail-steps-hint'),
    detailPending: document.querySelector('.detail-pending'),
    detailCount: document.querySelector('.detail-count'),
    detailClose: document.querySelector('.detail-close'),
    detailPrev: document.querySelector('.detail-prev'),
    detailNext: document.querySelector('.detail-next'),
  }

  function normalize(value) {
    return String(value || '').trim().toLocaleLowerCase('zh-CN')
  }

  function matchesQuery(pose, query) {
    const stepContent = (pose.vinyasaSteps || []).flatMap(item => [
      item.count,
      item.breath,
      item.action,
      item.drishti,
    ])
    const haystack = [
      pose.name,
      pose.sanskrit,
      pose.cueName,
      pose.action,
      pose.drishti,
      pose.drishtiSanskrit,
      ...(pose.aliases || []),
      ...stepContent,
    ]
      .map(normalize)
      .join(' ')
    return haystack.includes(query)
  }

  function getVisiblePoses() {
    const query = normalize(state.query)
    if (query) return payload.poses.filter(pose => matchesQuery(pose, query))
    return payload.poses.filter(pose => pose.section === state.activeSection)
  }

  function createCard(pose) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'pose-card'
    button.dataset.poseId = pose.id
    button.setAttribute('aria-label', `查看${pose.name}`)

    const thumbnail = document.createElement('span')
    thumbnail.className = 'pose-thumbnail'
    const image = document.createElement('img')
    image.alt = pose.name
    image.loading = 'lazy'
    image.decoding = 'async'
    image.addEventListener('load', () => image.classList.add('loaded'), { once: true })
    image.src = pose.thumbnail
    if (image.complete) image.classList.add('loaded')
    thumbnail.appendChild(image)

    const name = document.createElement('span')
    name.className = 'pose-card-name'
    name.textContent = pose.section === 'sun' ? pose.name : (pose.cueName || pose.name)
    button.append(thumbnail, name)
    button.addEventListener('click', () => openDetail(pose.id))
    return button
  }

  function render() {
    state.visiblePoses = getVisiblePoses()
    const fragment = document.createDocumentFragment()
    state.visiblePoses.forEach(pose => fragment.appendChild(createCard(pose)))
    elements.grid.replaceChildren(fragment)

    const hasQuery = Boolean(normalize(state.query))
    elements.resultSummary.textContent = hasQuery
      ? `找到 ${state.visiblePoses.length} 个体式`
      : `${sectionLabels[state.activeSection]} · ${state.visiblePoses.length} 个体式`
    elements.empty.hidden = state.visiblePoses.length !== 0
    elements.grid.hidden = state.visiblePoses.length === 0
    elements.clearSearch.hidden = !hasQuery

    elements.navButtons.forEach(button => {
      const isActive = !hasQuery && button.dataset.section === state.activeSection
      if (isActive) button.setAttribute('aria-current', 'page')
      else button.removeAttribute('aria-current')
    })
  }

  function clearSearch() {
    state.query = ''
    elements.search.value = ''
    render()
    elements.search.focus({ preventScroll: true })
  }

  function selectSection(section) {
    state.activeSection = section
    state.query = ''
    elements.search.value = ''
    render()
    const targetTop = Math.max(0, elements.searchSticky.offsetTop)
    window.scrollTo({ top: targetTop, behavior: 'auto' })
  }

  function freezePage() {
    state.savedScrollY = window.scrollY
    document.body.style.top = `-${state.savedScrollY}px`
    document.body.classList.add('detail-open')
  }

  function restorePage() {
    document.body.classList.remove('detail-open')
    document.body.style.top = ''
    const previousScrollBehavior = document.documentElement.style.scrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'
    window.scrollTo(0, state.savedScrollY)
    window.requestAnimationFrame(() => {
      document.documentElement.style.scrollBehavior = previousScrollBehavior
    })
  }

  function openDetail(poseId) {
    const index = state.visiblePoses.findIndex(pose => pose.id === poseId)
    if (index < 0) return
    state.selectedIndex = index
    freezePage()
    elements.detail.hidden = false
    renderDetail()
    elements.detailScroll.scrollTop = 0
    elements.detailClose.focus({ preventScroll: true })
  }

  function closeDetail() {
    elements.detail.hidden = true
    state.selectedIndex = -1
    restorePage()
  }

  function navigateDetail(direction) {
    const count = state.visiblePoses.length
    if (!count) return
    state.selectedIndex = (state.selectedIndex + direction + count) % count
    renderDetail()
    elements.detailScroll.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function renderDetail() {
    const pose = state.visiblePoses[state.selectedIndex]
    if (!pose) return
    const detailSteps = pose.vinyasaSteps?.length
      ? pose.vinyasaSteps
      : pose.action
        ? [{
            count: pose.vinyasaStep || '—',
            breath: pose.breath || '—',
            action: pose.action,
            drishti: pose.drishti,
            isAsana: false,
            holdBreaths: pose.holdBreaths,
          }]
        : []

    elements.detailImage.classList.remove('loaded')
    elements.detailPlaceholder.hidden = false
    elements.detailImage.onload = () => {
      elements.detailImage.classList.add('loaded')
      elements.detailPlaceholder.hidden = true
    }
    elements.detailImage.src = pose.image
    elements.detailImage.alt = pose.name
    if (elements.detailImage.complete && elements.detailImage.naturalWidth > 0) {
      elements.detailImage.onload()
    }

    elements.detailName.textContent = pose.name
    elements.detailCueName.textContent = pose.cueName || pose.sanskrit
    elements.detailMetadata.hidden = !pose.cueName
    elements.detailVinyasaItem.hidden = !pose.vinyasaCount
    elements.detailVinyasaCount.textContent = pose.vinyasaCount || ''
    elements.detailDrishti.textContent = pose.drishti || '—'
    elements.detailDrishtiSanskrit.textContent = pose.drishtiSanskrit || ''
    elements.detailSteps.hidden = detailSteps.length === 0
    elements.detailPending.hidden = detailSteps.length !== 0

    const hasAsanaStep = detailSteps.some(item => item.isAsana)
    elements.detailStepsHint.hidden = !hasAsanaStep
    elements.detailSteps.replaceChildren(...detailSteps.map(createStepCard))
    elements.detailCount.textContent = `${state.selectedIndex + 1} / ${state.visiblePoses.length}`
  }

  function createStepCard(step) {
    const card = document.createElement('article')
    card.className = `vinyasa-step${step.isAsana ? ' is-asana' : ''}`
    card.dataset.vinyasaStep = step.count
    card.dataset.asana = step.isAsana ? 'true' : 'false'

    const header = document.createElement('div')
    header.className = 'vinyasa-step-header'

    const count = document.createElement('span')
    count.className = 'vinyasa-step-count'
    count.textContent = step.count === '—' ? '-' : `V${step.count}`

    const breath = document.createElement('span')
    breath.className = 'vinyasa-step-breath'
    breath.textContent = step.breath || '—'
    header.append(count, breath)

    if (step.drishti) {
      const drishti = document.createElement('span')
      drishti.className = 'vinyasa-step-drishti'
      drishti.textContent = `看${step.drishti}`
      header.appendChild(drishti)
    }

    const action = document.createElement('p')
    action.className = 'vinyasa-step-action'
    action.textContent = step.action
    card.append(header, action)

    if (step.holdBreaths) {
      const hold = document.createElement('p')
      hold.className = 'vinyasa-step-hold'
      hold.textContent = `停留 ${step.holdBreaths} 次呼吸`
      card.appendChild(hold)
    }

    return card
  }

  elements.search.addEventListener('input', event => {
    state.query = event.target.value
    render()
  })
  elements.clearSearch.addEventListener('click', clearSearch)
  elements.resetSearch.addEventListener('click', clearSearch)
  elements.navButtons.forEach(button => {
    button.addEventListener('click', () => selectSection(button.dataset.section))
  })
  elements.detailClose.addEventListener('click', closeDetail)
  elements.detailPrev.addEventListener('click', () => navigateDetail(-1))
  elements.detailNext.addEventListener('click', () => navigateDetail(1))

  document.addEventListener('keydown', event => {
    if (elements.detail.hidden) return
    if (event.key === 'Escape') closeDetail()
    if (event.key === 'ArrowLeft') navigateDetail(-1)
    if (event.key === 'ArrowRight') navigateDetail(1)
  })

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      ([entry]) => elements.searchSticky.classList.toggle('is-stuck', !entry.isIntersecting),
      { threshold: 0 },
    )
    observer.observe(elements.sentinel)
  }

  render()
})()
