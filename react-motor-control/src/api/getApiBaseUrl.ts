export function getApiBaseUrl(): string {
    const envBaseUrl = import.meta.env.VITE_API_URL?.trim()
    if (envBaseUrl) {
        return envBaseUrl.replace(/\/+$/, '')
    }

    const host = window.location.hostname
    if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:3001'
    }

    // Production default: same origin behind reverse proxy.
    return ''
}
