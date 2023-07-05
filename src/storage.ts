declare global {
  const chrome: {
    storage: {
      local: {
        get: (properties: string[], callback: (data: any) => void) => void;
        set: (data: any, callback: () => void) => void;
      };
    };
  };
}

export default class Storage<State extends Record<string, any>> {
  async get(property: keyof State): Promise<State[keyof State]> {
    const data = await this.getMany([property]);
    return data[property];
  }

  async set(property: keyof State, value: State[keyof State]) {
    await this.setMany({ [property]: value } as Partial<State>);
  }

  async getMany(properties: (keyof State)[]): Promise<Partial<State>> {
    return new Promise((resolve) => {
      chrome.storage.local.get(properties as string[], (data) => {
        resolve(data);
      });
    });
  }

  async setMany(data: Partial<State>) {
    return new Promise<void>((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }
}
