import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, Pressable, StyleSheet, TextInput, View } from "react-native";
import { AppTextInput, AppTextInputProps } from "@/components/base/AppTextInput";
import { AppText } from "@/components/base/AppText";
import { AppColorPalettes, AppColors } from "@/theme/colors";
import { AppIcon } from "@/components/base/AppIcon";
import { Identity } from "@/api";
import { useDebounce } from "@/util/hooks/debounce";

export interface AppAutocompleteProps<T extends Identity> extends Omit<Omit<AppTextInputProps, "onChange">, "value"> {
  value?: T;
  items: T[];
  onSearch?: (text: string) => void;
  onChange?: (value?: T) => void;
  renderItem: (item: T) => JSX.Element;

  trailing?: JSX.Element;
}

export type BasicItem = Readonly<{ id?: string; label: string }>;

const borderRadius = 24;
export const AppAutocomplete = <T extends BasicItem>({
  value,
  items,
  onSearch,
  onChange,
  renderItem,
  trailing,
  ...props
}: AppAutocompleteProps<T>) => {
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
  const trailingIcon =
    value || (search && search.length > 0) ? (
      <Pressable onPress={reset}>
        <AppIcon name={"close-outline"} color={AppColorPalettes.gray[800]} />
      </Pressable>
    ) : (
      trailing
    );

  return (
    <View style={[styles.container, { maxHeight: open ? undefined : 2 * borderRadius }]}>
      <View style={[styles.inputContainer, { borderBottomRightRadius: open ? 0 : borderRadius, borderBottomLeftRadius: open ? 0 : borderRadius }]}>
        <AppTextInput
          ref={inputRef}
          style={styles.input}
          leading={leading}
          trailing={trailingIcon}
          blurOnSubmit={false}
          value={search ?? value?.label ?? undefined}
          onChangeText={setSearch}
          onFocus={onFocus}
          onBlur={onBlur}
          onTouchCancel={onBlur}
          {...props}
        />
      </View>

      {open && (
        <View style={{ position: "absolute", left: 0, right: 0, top: 2 * borderRadius }}>
          <View style={[styles.itemsContainer, { maxHeight: items.length > 3 ? `${Math.floor((100 * 3) / items.length)}%` : "100%" }]}>
            <ItemList items={items} loading={debouncedSearch !== undefined} onSelect={onSelect} renderItem={renderItem} />
          </View>
        </View>
      )}
    </View>
  );
};

type ItemListProps<T extends Identity> = Readonly<{
  items: T[];
  loading?: boolean;
  onSelect: (value: T) => void;
  renderItem: (item: T) => JSX.Element;
}>;

function ItemList<T extends BasicItem>({ items, loading, onSelect, renderItem }: ItemListProps<T>) {
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
      renderItem={({ item }) => <AutocompleteItem itemView={renderItem(item)} onPress={() => onSelect(item)} />}
    />
  );
}

type AutocompleteItemProps = Readonly<{
  itemView: JSX.Element;
  onPress?: () => void;
}>;

const AutocompleteItem = ({ itemView, onPress }: AutocompleteItemProps) => (
  <Pressable style={styles.item} onPress={onPress}>
    {itemView}
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexShrink: 1
  },
  input: {
    fontSize: 18,
    paddingVertical: 4,
    color: AppColorPalettes.gray[800]
  },
  item: {
    paddingHorizontal: borderRadius,
    paddingVertical: 12
  },
  itemsContainer: {
    width: "100%",
    flexGrow: 1,
    zIndex: 10,
    flexShrink: 1,
    backgroundColor: AppColorPalettes.gray[100],
    borderRadius,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
    borderTopColor: AppColorPalettes.gray[400]
  },
  inputContainer: {
    height: 2 * borderRadius,
    backgroundColor: AppColors.white,
    alignContent: "center",
    alignItems: "center",
    borderRadius,
    paddingLeft: 12,
    paddingVertical: 4,
    paddingRight: 12
  }
});
