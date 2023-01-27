import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, StyleSheet, TouchableOpacity, View } from "react-native";
import { AppTextInput, AppTextInputProps } from "@/components/base/AppTextInput";
import { AppText } from "@/components/base/AppText";
import useDebounce from "@/api/hook";
import { AppColors } from "@/theme/colors";

export interface AppAutocompleteProps<T> extends Omit<Omit<AppTextInputProps, "onChange">, "value"> {
  value?: T;
  items: T[];
  onSearch?: (text: string) => void;
  onChange?: (value?: T) => void;
}

export type BasicItem = Readonly<{ id?: string; label: string }>;

export function AppAutocomplete<T extends BasicItem>({ value, items, onSearch, onChange, ...props }: AppAutocompleteProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState<string>();
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (debouncedSearch && onSearch) {
      setOpen(true);
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

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

  return (
    <View style={[styles.inputContainer, { borderBottomRightRadius: open ? 0 : 8, borderBottomLeftRadius: open ? 0 : 8 }]}>
      <AppTextInput
        style={styles.input}
        icon="map"
        blurOnSubmit={false}
        value={search ?? value?.label ?? undefined}
        onChangeText={setSearch}
        onFocus={() => setSearch("")}
        onBlur={() => setOpen(false)}
        onTouchCancel={() => setOpen(false)}
        {...props}
      />

      {open && (
        <View style={{ zIndex: 100, position: "absolute", left: 0, right: 0, top: 40 }}>
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
    return <AppText style={[styles.item, { color: AppColors.gray600 }]}>Aucun résultat</AppText>;
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
    color: AppColors.gray800
  },
  item: {
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  itemsContainer: {
    width: "100%",
    maxHeight: 108,
    backgroundColor: AppColors.gray100,
    borderRadius: 8,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 1,
    borderTopColor: AppColors.gray400
  },
  inputContainer: {
    height: 40,
    paddingVertical: 8,
    backgroundColor: AppColors.white,
    alignContent: "center",
    alignItems: "center",
    borderRadius: 8,
    paddingLeft: 20
  }
});
