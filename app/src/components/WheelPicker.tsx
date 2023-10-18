/* Inspired from https://github.com/erksch/react-native-wheely */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StyleProp,
  TextStyle,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
  ViewStyle,
  View,
  ViewProps,
  FlatListProps,
  FlatList
} from "react-native";
import { StyleSheet } from "react-native";
import { AppText } from "@/components/base/AppText";
import { mod } from "@/util/numbers";
interface Props {
  selectedIndex: number;
  options: string[];
  onChanged: (index: number) => void;
  selectedIndicatorStyle?: StyleProp<ViewStyle>;
  itemTextStyle?: TextStyle;
  itemStyle?: ViewStyle;
  itemHeight?: number;
  containerStyle?: ViewStyle;
  containerProps?: Omit<ViewProps, "style">;
  scaleFunction?: (x: number) => number;
  rotationFunction?: (x: number) => number;
  opacityFunction?: (x: number) => number;
  visibleRest?: number;
  decelerationRate?: "normal" | "fast" | number;
  flatListProps?: Omit<FlatListProps<string | null>, "data" | "renderItem">;
  isInfinite?: boolean;

  onChange?: (index: number) => void;
}

export const WheelPicker: React.FC<Props> = ({
  selectedIndex,
  options,
  onChanged,
  selectedIndicatorStyle = {},
  containerStyle = {},
  itemStyle = {},
  itemTextStyle = {},
  itemHeight = 40,
  scaleFunction = (x: number) => 1.0 ** x,
  rotationFunction = (x: number) => 1 - Math.pow(1 / 2, x),
  opacityFunction = (x: number) => Math.pow(1 / 3, x),
  visibleRest = 2,
  decelerationRate = "fast",
  containerProps = {},
  flatListProps = {},
  isInfinite = false,
  onChange
}) => {
  const flatListRef = useRef<FlatList>(null);
  if (isInfinite) {
    selectedIndex = mod(selectedIndex + 1, options.length);
  }

  const oldVal = useRef(selectedIndex);

  const [scrollY] = useState(new Animated.Value(0));

  const containerHeight = (1 + visibleRest * 2) * itemHeight;
  const paddedOptions = useMemo(() => {
    const array: (string | null)[] = [...options];
    if (!isInfinite || array.length < visibleRest * 2 + 1) {
      for (let i = 0; i < visibleRest; i++) {
        array.unshift(null);
        array.push(null);
      }
    } else {
      for (let i = 0; i < visibleRest + 1; i++) {
        array.unshift(array[array.length - i * 2 - 1]);
        array.push(array[i * 2 + 1]);
      }
    }
    return array;
  }, [isInfinite, options, visibleRest]);

  const offsets = useMemo(() => [...Array(paddedOptions.length)].map((x, i) => i * itemHeight), [paddedOptions, itemHeight]);

  const currentScrollIndex = useMemo(() => Animated.add(Animated.divide(scrollY, itemHeight), visibleRest), [visibleRest, scrollY, itemHeight]);
  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    // Due to list bounciness when scrolling to the start or the end of the list
    // the offset might be negative or over the last item.
    // We therefore clamp the offset to the supported range.
    const offsetY = isInfinite
      ? event.nativeEvent.contentOffset.y
      : Math.min(itemHeight * (options.length - 1), Math.max(event.nativeEvent.contentOffset.y, 0));

    let index = Math.floor(Math.floor(offsetY) / itemHeight);
    const last = Math.floor(offsetY % itemHeight);
    if (last > itemHeight / 2) {
      index++;
    }

    if (isInfinite) {
      index = mod(index - 1, options.length);
    }

    onChanged(index);
  };

  const handleInfiniteScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    let index = Math.floor(Math.floor(offsetY) / itemHeight);

    if (index <= 0 && offsetY <= 0) {
      // console.log("shouldT", options.length, oldVal.current, index);
      oldVal.current = options.length;
      flatListRef.current?.scrollToOffset({
        animated: false,
        offset: event.nativeEvent.contentSize.height - itemHeight * ((1 + visibleRest) * 2)
      });
    } else if (index > options.length && offsetY >= (options.length + 1) * itemHeight) {
      // Going down, needs shifting
      //  console.log("shouldD", options.length, oldVal.current, index);
      oldVal.current = 1;
      flatListRef.current?.scrollToOffset({ animated: false, offset: itemHeight });
    }

    const last = Math.floor(offsetY % itemHeight);
    if (last > itemHeight / 2) {
      index++;
    }

    index = mod(index - 1, options.length);

    if (index !== oldVal.current && onChange) {
      onChange(index);
    }
    oldVal.current = mod(index + 1, options.length);
  };

  useEffect(() => {
    if (selectedIndex < 0 || selectedIndex >= options.length) {
      throw new Error(`Selected index ${selectedIndex} is out of bounds [0, ${options.length - 1}]`);
    }
  }, [selectedIndex, options]);

  /**
   * If selectedIndex is changed from outside (not via onChange) we need to scroll to the specified index.
   * This ensures that what the user sees as selected in the picker always corresponds to the value state.
   */
  useEffect(() => {
    // console.log(selectedIndex, oldVal.current, "->", options.length);
    if (selectedIndex !== oldVal.current) {
      // console.log("o");
      flatListRef.current?.scrollToIndex({
        index: selectedIndex,
        animated: true
      });
    }
  }, [selectedIndex]);

  const renderItem = useCallback<({ item, index }: { item: any; index: any }) => React.ReactElement>(
    ({ item: option, index }) => (
      <WheelPickerItem
        key={`option-${index}`}
        index={index}
        option={option}
        style={itemStyle}
        textStyle={itemTextStyle}
        height={itemHeight}
        currentScrollIndex={currentScrollIndex}
        scaleFunction={scaleFunction}
        rotationFunction={rotationFunction}
        opacityFunction={opacityFunction}
        visibleRest={visibleRest}
      />
    ),
    [currentScrollIndex, itemHeight, itemStyle, itemTextStyle, opacityFunction, rotationFunction, scaleFunction, visibleRest]
  );

  return (
    <View style={[styles.container, { height: containerHeight }, containerStyle]} {...containerProps}>
      <View
        style={[
          styles.selectedIndicator,
          selectedIndicatorStyle,
          {
            transform: [{ translateY: -itemHeight / 2 }],
            height: itemHeight
          }
        ]}
      />
      <Animated.FlatList<string | null>
        {...flatListProps}
        ref={flatListRef}
        style={styles.scrollView}
        initialNumToRender={isInfinite ? paddedOptions.length : undefined}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
          useNativeDriver: true,
          listener: isInfinite ? handleInfiniteScroll : undefined
        })}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        snapToOffsets={offsets}
        decelerationRate={decelerationRate}
        initialScrollIndex={selectedIndex}
        overScrollMode={isInfinite ? "never" : undefined}
        getItemLayout={(data, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index
        })}
        data={paddedOptions}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
      />
    </View>
  );
};

interface ItemProps {
  textStyle: StyleProp<TextStyle>;
  style: StyleProp<ViewStyle>;
  option: string | null;
  height: number;
  index: number;
  currentScrollIndex: Animated.AnimatedAddition<any>;
  visibleRest: number;
  rotationFunction: (x: number) => number;
  opacityFunction: (x: number) => number;
  scaleFunction: (x: number) => number;
}

const WheelPickerItem: React.FC<ItemProps> = React.memo(
  ({ textStyle, style, height, option, index, visibleRest, currentScrollIndex, opacityFunction, rotationFunction, scaleFunction }) => {
    const relativeScrollIndex = Animated.subtract(index, currentScrollIndex);

    const translateY = relativeScrollIndex.interpolate({
      inputRange: (() => {
        const range = [0];
        for (let i = 1; i <= visibleRest + 1; i++) {
          range.unshift(-i);
          range.push(i);
        }
        return range;
      })(),
      outputRange: (() => {
        const range = [0];
        for (let i = 1; i <= visibleRest + 1; i++) {
          let y = (height / 2) * (1 - Math.sin(Math.PI / 2 - rotationFunction(i)));
          for (let j = 1; j < i; j++) {
            y += height * (1 - Math.sin(Math.PI / 2 - rotationFunction(j)));
          }
          range.unshift(y);
          range.push(-y);
        }
        return range;
      })()
    });

    const opacity = relativeScrollIndex.interpolate({
      inputRange: (() => {
        const range = [0];
        for (let i = 1; i <= visibleRest + 1; i++) {
          range.unshift(-i);
          range.push(i);
        }
        return range;
      })(),
      outputRange: (() => {
        const range = [1];
        for (let x = 1; x <= visibleRest + 1; x++) {
          const y = opacityFunction(x);
          range.unshift(y);
          range.push(y);
        }
        return range;
      })()
    });

    const scale = relativeScrollIndex.interpolate({
      inputRange: (() => {
        const range = [0];
        for (let i = 1; i <= visibleRest + 1; i++) {
          range.unshift(-i);
          range.push(i);
        }
        return range;
      })(),
      outputRange: (() => {
        const range = [1.0];
        for (let x = 1; x <= visibleRest + 1; x++) {
          const y = scaleFunction(x);
          range.unshift(y);
          range.push(y);
        }
        return range;
      })()
    });

    const rotateX = relativeScrollIndex.interpolate({
      inputRange: (() => {
        const range = [0];
        for (let i = 1; i <= visibleRest + 1; i++) {
          range.unshift(-i);
          range.push(i);
        }
        return range;
      })(),
      outputRange: (() => {
        const range = ["0deg"];
        for (let x = 1; x <= visibleRest + 1; x++) {
          const y = rotationFunction(x);
          range.unshift(`${y}deg`);
          range.push(`${y}deg`);
        }
        return range;
      })()
    });

    return (
      <Animated.View style={[styles.option, style, { height, opacity, transform: [{ translateY }, { rotateX }, { scale }] }]}>
        <AppText style={[textStyle, { fontSize: 20 }]}>{option}</AppText>
      </Animated.View>
    );
  },
  () => true
);

const styles = StyleSheet.create({
  container: {
    position: "relative"
  },
  selectedIndicator: {
    position: "absolute",
    width: "100%",
    backgroundColor: "hsl(200, 8%, 94%)",
    borderRadius: 5,
    top: "50%"
  },
  scrollView: {
    overflow: "hidden",
    flex: 1
  },
  option: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    zIndex: 100
  }
});
