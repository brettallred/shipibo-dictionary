import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["input", "form", "results"]

  connect() {
    this.timeout = null

    // Focus input and move cursor to end on initial page load
    if (this.hasInputTarget) {
      const input = this.inputTarget
      const len = input.value.length
      input.focus()
      if (len > 0) {
        input.setSelectionRange(len, len)
      }
    }
  }

  search() {
    clearTimeout(this.timeout)
    const query = this.inputTarget.value.trim()

    if (query.length < 2) {
      if (this.hasResultsTarget) {
        this.resultsTarget.classList.add("hidden")
        this.resultsTarget.innerHTML = ""
      }
      return
    }

    this.timeout = setTimeout(() => {
      this.fetchResults(query)
    }, 250)
  }

  submitForm(event) {
    // Prevent Turbo Drive navigation — handle search inline instead.
    // This avoids the full page replace that resets cursor position.
    event.preventDefault()
    clearTimeout(this.timeout)

    const query = this.inputTarget.value.trim()
    if (query.length >= 2) {
      // Update URL so it's bookmarkable / back-button works
      const url = `${this.formTarget.action}?q=${encodeURIComponent(query)}`
      history.pushState({}, "", url)
      this.fetchResults(query)
    }
  }

  async fetchResults(query) {
    const url = `${this.formTarget.action}?q=${encodeURIComponent(query)}`

    try {
      const response = await fetch(url, {
        headers: {
          "Accept": "text/html",
          "X-Requested-With": "XMLHttpRequest"
        }
      })

      if (!response.ok) return

      const html = await response.text()
      const doc = new DOMParser().parseFromString(html, "text/html")

      // Extract the results content from the fetched search page
      const fetchedResults = doc.querySelector('[data-search-target="results"]')

      if (this.hasResultsTarget && fetchedResults) {
        this.resultsTarget.innerHTML = fetchedResults.innerHTML
        this.resultsTarget.classList.remove("hidden")
      }
    } catch (e) {
      // Silently fail on network errors
    }
  }

  disconnect() {
    clearTimeout(this.timeout)
  }
}
