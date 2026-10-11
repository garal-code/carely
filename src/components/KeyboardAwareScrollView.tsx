import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Platform, ScrollView, TextInput, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent, ScrollViewProps } from 'react-native';

// Distancia mínima entre el campo enfocado y el borde superior del teclado.
const MARGIN = 24;

type KeyboardAwareInput = {
  onInputFocus: () => void;
  onInputBlur: () => void;
  onInputResize: () => void;
};

// Fuera de un KeyboardAwareScrollView los avisos de los campos no hacen nada.
const noop = () => {};
const KeyboardAwareContext = createContext<KeyboardAwareInput>({
  onInputFocus: noop,
  onInputBlur: noop,
  onInputResize: noop,
});

export function useKeyboardAwareInput() {
  return useContext(KeyboardAwareContext);
}

/**
 * ScrollView que mantiene visible sobre el teclado el campo enfocado (y el final
 * de un texto multilínea que crece). Solo usa APIs de React Native, compatible con Expo Go.
 */
export function KeyboardAwareScrollView({
  children,
  onScroll,
  keyboardShouldPersistTaps = 'handled',
  scrollEventThrottle = 16,
  ...props
}: ScrollViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const hasFocus = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [inset, setInset] = useState(0);

  const ensureVisible = useCallback(() => {
    const input = TextInput.State.currentlyFocusedInput();
    const scroll = scrollRef.current?.getNativeScrollRef();
    const top = keyboardTop.current;
    if (!hasFocus.current || !input || !scroll || top == null) return;
    scroll.measureInWindow((_sx, sy, _sw, sh) => {
      input.measureInWindow((_ix, iy, _iw, ih) => {
        // Solo se desplaza si el borde inferior del campo queda tapado o fuera de la vista.
        const overflow = iy + ih + MARGIN - Math.min(sy + sh, top);
        if (overflow > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overflow, animated: true });
      });
    });
  }, []);

  // Se mide tras un instante para que el relleno inferior ya esté aplicado.
  const schedule = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(ensureVisible, 50);
  }, [ensureVisible]);

  useEffect(() => {
    // iOS avisa antes de animar el teclado (will*); Android solo cuando ya se ha mostrado (did*).
    // En Android edge-to-edge la ventana no se encoge, así que el relleno lo pone este componente.
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (event) => {
      const top = event.endCoordinates.screenY;
      keyboardTop.current = top;
      // Se rellena solo la parte de la lista que tapa el teclado (0 si la ventana ya se ha encogido).
      scrollRef.current
        ?.getNativeScrollRef()
        ?.measureInWindow((_x, y, _w, h) => setInset(Math.max(0, y + h - top)));
      schedule();
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      keyboardTop.current = null;
      setInset(0);
    });
    return () => {
      show.remove();
      hide.remove();
      clearTimeout(timer.current);
    };
  }, [schedule]);

  useEffect(() => {
    if (inset > 0) schedule();
  }, [inset, schedule]);

  const input = useMemo<KeyboardAwareInput>(
    () => ({
      onInputFocus: () => {
        hasFocus.current = true;
        schedule();
      },
      onInputBlur: () => {
        hasFocus.current = false;
      },
      onInputResize: schedule,
    }),
    [schedule],
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
    onScroll?.(event);
  };

  return (
    <KeyboardAwareContext value={input}>
      <ScrollView
        ref={scrollRef}
        {...props}
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        scrollEventThrottle={scrollEventThrottle}
        onScroll={handleScroll}
      >
        {children}
        {inset > 0 ? <View style={{ height: inset }} /> : null}
      </ScrollView>
    </KeyboardAwareContext>
  );
}
