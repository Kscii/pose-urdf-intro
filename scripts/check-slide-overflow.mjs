#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises'
import { createServer } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parseSync } from '@slidev/parser'
import { chromium } from 'playwright-chromium'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'dist')
const slidesPath = path.join(rootDir, 'slides.md')
const tolerance = 1

const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
])

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

async function resolveStaticFile(requestUrl) {
  const pathname = decodeURIComponent(new URL(requestUrl, 'http://localhost').pathname)
  const relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '')
  let candidate = path.resolve(distDir, relativePath)

  if (!isInside(distDir, candidate))
    return null

  try {
    const details = await stat(candidate)
    if (details.isDirectory())
      candidate = path.join(candidate, 'index.html')
    else if (!details.isFile())
      return null
    return candidate
  }
  catch {
    // Slidev uses history routing, so unknown routes render the app shell.
    if (!path.extname(relativePath))
      return path.join(distDir, 'index.html')
    return null
  }
}

async function startStaticServer() {
  const server = createServer((request, response) => {
    void (async () => {
      const filePath = await resolveStaticFile(request.url ?? '/')
      if (!filePath) {
        response.writeHead(404)
        response.end('Not found')
        return
      }

      const body = await readFile(filePath)
      response.writeHead(200, {
        'Cache-Control': 'no-store',
        'Content-Type': contentTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream',
      })
      response.end(body)
    })().catch((error) => {
      response.writeHead(500)
      response.end(String(error))
    })
  })

  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })

  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('Unable to determine the preview server address')

  return {
    close: () => new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve())
    }),
    url: `http://127.0.0.1:${address.port}/`,
  }
}

async function waitForSlide(page, slideNumber) {
  await page.waitForFunction((number) => {
    const layout = document.querySelector(`.slidev-page[data-slidev-no="${number}"] .slidev-layout`)
    return layout?.getBoundingClientRect().width > 0
  }, slideNumber)

  await page.evaluate(async (number) => {
    await document.fonts?.ready
    const layout = document.querySelector(`.slidev-page[data-slidev-no="${number}"] .slidev-layout`)
    const images = [...(layout?.querySelectorAll('img') ?? [])]
    await Promise.all(images.map(image => image.complete
      ? Promise.resolve()
      : new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true })
          image.addEventListener('error', resolve, { once: true })
        })))
  }, slideNumber)
}

async function measureSlide(page, slideNumber) {
  return page.evaluate(({ number, allowed }) => {
    const layout = document.querySelector(`.slidev-page[data-slidev-no="${number}"] .slidev-layout`)
    if (!layout)
      throw new Error(`Slide ${number} layout was not found`)

    const layoutRect = layout.getBoundingClientRect()
    const scaleX = layoutRect.width / layout.clientWidth
    const scaleY = layoutRect.height / layout.clientHeight
    const overflows = {
      bottom: Math.max(0, layout.scrollHeight - layout.clientHeight),
      left: 0,
      right: Math.max(0, layout.scrollWidth - layout.clientWidth),
      top: 0,
    }
    const representatives = {}

    for (const element of layout.querySelectorAll('*')) {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      if (style.display === 'none'
        || style.visibility === 'hidden'
        || Number(style.opacity) === 0
        || rect.width === 0
        || rect.height === 0)
        continue

      const elementOverflow = {
        bottom: Math.max(0, (rect.bottom - layoutRect.bottom) / scaleY),
        left: Math.max(0, (layoutRect.left - rect.left) / scaleX),
        right: Math.max(0, (rect.right - layoutRect.right) / scaleX),
        top: Math.max(0, (layoutRect.top - rect.top) / scaleY),
      }

      for (const [direction, amount] of Object.entries(elementOverflow)) {
        if (amount > overflows[direction]) {
          overflows[direction] = amount
          representatives[direction] = {
            className: typeof element.className === 'string' ? element.className : '',
            tagName: element.tagName.toLowerCase(),
            text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
          }
        }
      }
    }

    return {
      dimensions: `${layout.clientWidth}×${layout.clientHeight}`,
      failures: Object.entries(overflows)
        .filter(([, amount]) => amount > allowed)
        .map(([direction, amount]) => ({
          amount,
          direction,
          representative: representatives[direction],
        })),
      number,
      title: layout.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() ?? '(untitled)',
    }
  }, { allowed: tolerance, number: slideNumber })
}

function describeRepresentative(representative) {
  if (!representative)
    return ''
  const className = representative.className
    ? `.${representative.className.trim().split(/\s+/).join('.')}`
    : ''
  const text = representative.text ? ` “${representative.text}”` : ''
  return ` — ${representative.tagName}${className}${text}`
}

const markdown = await readFile(slidesPath, 'utf8')
const slideCount = parseSync(markdown, slidesPath).slides.length
const preview = await startStaticServer()
let browser

try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { height: 720, width: 1280 } })
  await page.goto(preview.url, { waitUntil: 'networkidle' })

  const failedSlides = []
  for (let slideNumber = 1; slideNumber <= slideCount; slideNumber += 1) {
    await waitForSlide(page, slideNumber)
    const result = await measureSlide(page, slideNumber)

    if (result.failures.length === 0) {
      console.log(`✓ ${String(slideNumber).padStart(2, '0')}/${slideCount} ${result.title} (${result.dimensions})`)
    }
    else {
      failedSlides.push(result)
      console.error(`✗ ${String(slideNumber).padStart(2, '0')}/${slideCount} ${result.title}`)
      for (const failure of result.failures) {
        console.error(`  ${failure.direction} +${failure.amount.toFixed(1)}px${describeRepresentative(failure.representative)}`)
      }
    }

    if (slideNumber < slideCount) {
      await page.keyboard.press('ArrowRight')
      await page.waitForFunction(
        number => Number(document.querySelector('.slidev-page:not([style*="display: none"])')?.dataset.slidevNo) === number,
        slideNumber + 1,
      )
    }
  }

  if (failedSlides.length > 0) {
    process.exitCode = 1
    console.error(`\n${failedSlides.length}/${slideCount} slide(s) overflow the Slidev canvas.`)
  }
  else {
    console.log(`\nAll ${slideCount} slides fit within the Slidev canvas.`)
  }
}
finally {
  await browser?.close()
  await preview.close()
}
