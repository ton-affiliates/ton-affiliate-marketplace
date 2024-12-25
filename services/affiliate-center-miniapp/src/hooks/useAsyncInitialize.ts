import { useEffect, useState } from 'react';

//a general purpose React hook that will assist us in initializing async objects
export function useAsyncInitialize<T>(func: () => Promise<T>, deps: any[] = []) {
  const [state, setState] = useState<T | undefined>();
  useEffect(() => {
    (async () => {
      setState(await func());
    })();
  }, deps);

  return state;
}