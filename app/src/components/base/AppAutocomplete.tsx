import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { AppTextInput, AppTextInputProps } from "@/components/base/AppTextInput";
import { AppText } from "@/components/base/AppText";
import useDebounce from "@/api/hook";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";

export interface AppAutocompleteProps<T> extends Omit<Omit<AppTextInputProps, "onChange">, "value"> {
  value?: T;
  items: T[];
  onSearch?: (text: string) => void;
  onChange?: (value?: T) => void;
}

export type BasicItem = Readonly<{ id?: string; label: string }>;

const borderRadius = 24;
export function AppAutocomplete<T extends BasicItem>({ value, items, onSearch, onChange, ...props }: AppAutocompleteProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState<string>();
  const debouncedSearch = useDebounce(search);
  const [focused, setFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const onFocus = () => {
    setFocused(true);
  };

  const onBlur = () => {
    setFocused(false);
    setOpen(false);
  };

  useEffect(() => {
    if (debouncedSearch && onSearch) {
      setOpen(true);
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch]);

  const onSelect = useCallback(
    (item?: T) => {
      setSearch(undefined);
      setOpen(false);
      Keyboard.dismiss();
      if (onChange) {
        onChange(item);
      }
    },
    [onChange]
  );

  const reset = () => {
    inputRef.current?.clear();
    if (value && onChange) {
      onChange(undefined);
    }
    setOpen(false);
    setSearch(undefined);
    inputRef.current?.focus();
  };

  const leading = <AppIcon name={"search-outline"} color={focused ? AppColorPalettes.blue[500] : AppColorPalettes.gray[400]} />;
  const trailing =
    value || (search && search.length > 0) ? (
      <Pressable onPress={reset}>
        <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
      </Pressable>
    ) : undefined;

  return (
    <View style={[styles.inputContainer, { borderBottomRightRadius: open ? 0 : borderRadius, borderBottomLeftRadius: open ? 0 : borderRadius }]}>
      <AppTextInput
        ref={inputRef}
        style={styles.input}
        leading={leading}
        trailing={(search && search.length > 0) || value ? trailing : undefined}
        blurOnSubmit={false}
        value={search ?? value?.label ?? undefined}
        onChangeText={setSearch}
        onFocus={onFocus}
        onBlur={onBlur}
        onTouchCancel={onBlur}
        {...props}
      />

      {open && (
        <View style={{ zIndex: 100, position: "absolute", left: 0, right: 0, top: 2 * borderRadius }}>
          <View style={styles.itemsContainer}>
            <ItemList items={items} loading={false} onSelect={onSelect} />
          </View>
        </View>
      )}
    </View>
  );
}

type ItemListProps<T> = Readonly<{
  items: T[];
  loading?: boolean;
  onSelect: (value: T) => void;
}>;

function ItemList<T extends BasicItem>({ items, loading, onSelect }: ItemListProps<T>) {
  if (loading) {
    return <ActivityIndicator />;
  }

  if (items.length === 0) {
    return <AppText style={[styles.item, { color: AppColorPalettes.gray[600] }]}>Aucun résultat</AppText>;
  }

  return (
    <FlatList
      keyboardShouldPersistTaps="always"
      data={items}
      keyExtractor={i => i.id!}
      renderItem={({ item }) => <AutocompleteItem item={item} onPress={() => onSelect(item)} />}
    />
  );
}

type AutocompleteItemProps = Readonly<{
  item: BasicItem;
  onPress?: () => void;
}>;

const AutocompleteItem = ({ item, onPress }: AutocompleteItemProps) => (
  <TouchableOpacity onPress={onPress}>
    <AppText style={styles.item}>{item.label}</AppText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  input: {
    fontSize: 20,
    color: AppColorPalettes.gray[800]
  },
  item: {
    fontSize: 18,
    paddingHorizontal: borderRadius,
    paddingVertical: 12
  },
  itemsContainer: {
    width: "100%",
    maxHeight: 108,
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
    borderTopColor: AppColorPalettes.gray[400]
  },
  inputContainer: {
    height: 2 * borderRadius,
    paddingVertical: 8,
    backgroundColor: AppColors.white,
    alignContent: "center",
    alignItems: "center",
    borderRadius,
    paddingLeft: 12,
    paddingRight: 12
  }
});
