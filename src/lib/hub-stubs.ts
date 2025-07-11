// Hub stubs to replace aws-amplify/utils Hub
// Maintains the same API but with mock implementations

type HubListener = (data: any) => void

class MockHub {
  private listeners: Map<string, HubListener[]> = new Map()

  listen(channel: string, callback: HubListener) {
    console.log('Mock Hub listener registered for:', channel)
    
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, [])
    }
    
    this.listeners.get(channel)?.push(callback)
    
    // Return unsubscribe function
    return () => {
      const channelListeners = this.listeners.get(channel)
      if (channelListeners) {
        const index = channelListeners.indexOf(callback)
        if (index > -1) {
          channelListeners.splice(index, 1)
        }
      }
      console.log('Mock Hub listener unsubscribed from:', channel)
    }
  }

  dispatch(channel: string, payload: any) {
    console.log('Mock Hub dispatch to channel:', channel, payload)
    
    const channelListeners = this.listeners.get(channel)
    if (channelListeners) {
      channelListeners.forEach(listener => {
        try {
          listener(payload)
        } catch (error) {
          console.error('Error in Hub listener:', error)
        }
      })
    }
  }

  // Simulate auth events for testing
  simulateSignIn() {
    this.dispatch('auth', {
      payload: {
        event: 'signedIn',
        data: {
          username: 'demo-user'
        }
      }
    })
  }

  simulateSignOut() {
    this.dispatch('auth', {
      payload: {
        event: 'signedOut',
        data: {}
      }
    })
  }
}

const mockHubInstance = new MockHub()

export const Hub = {
  listen: mockHubInstance.listen.bind(mockHubInstance),
  dispatch: mockHubInstance.dispatch.bind(mockHubInstance)
}

// Export the instance for manual testing if needed
export const mockHub = mockHubInstance