import React from "react";

export function useForceUpdate() {
    const [_, setState] = React.useState(0);
    return () => setState(prev => prev + 1);
}

export function useRefState<T>(intialState: T) {
    const forceUpdate = useForceUpdate();
    const stateRef = React.useRef(intialState);

    return [stateRef, (newState: T) => {
        stateRef.current = newState;
        forceUpdate();
    }] as [React.MutableRefObject<T>, (newState: T) => void]
}