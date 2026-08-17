const MAX_IN_FLIGHT = 12

const SLOT_TIMEOUT_MS = 20000

let inFlight = 0
const waiting = []

function pump() {
  while (inFlight < MAX_IN_FLIGHT && waiting.length) {
    inFlight++
    waiting.shift()()
  }
}

export function acquireCoverSlot() {
  return new Promise((resolve) => {
    const grant = () => {
      let released = false
      const timer = setTimeout(() => release(), SLOT_TIMEOUT_MS)

      function release() {
        if (released) return
        released = true
        clearTimeout(timer)
        inFlight--
        pump()
      }

      resolve(release)
    }

    waiting.push(grant)
    pump()
  })
}
