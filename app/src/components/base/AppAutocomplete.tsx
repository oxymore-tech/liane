import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList, Keyboard, TouchableOpacity, View
} from "react-native";
import { AppTextInput, AppTextInputProps } from "@/components/base/AppTextInput";
import { AppText } from "@/components/base/AppText";
import useDebounce from "@/api/hook";

export interface AppAutocompleteProps<T> extends Omit<Omit<AppTextInputProps, "onChange">, "value"> {
  value?: T;
  items: T[];
  onSearch?: (text: string) => void;
  onChange?: (value?: T) => void;
  zIndex?: number;
  loading?: boolean;
}

export type BasicItem = Readonly<{ id?: string, label: string }>;

export function AppAutocomplete<T extends BasicItem>({ value, items, onSearch, onChange, zIndex = 100, loading, ...props }: AppAutocompleteProps<T>) {

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState<string>();
  const debouncedSearch = useDebounce(search);

  useEffect(() => {
    if (debouncedSearch && onSearch) {
      setOpen(true);
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch]);

  const onSelect = useCallback((item?: T) => {
    setSearch(undefined);
    setOpen(false);
    Keyboard.dismiss();
    if (onChange) {
      onChange(item);
    }
  }, [onChange]);

  return (
    <View>
      <AppTextInput
        blurOnSubmit={false}
        value={search ?? value?.label ?? ""}
        onChangeText={setSearch}
        onFocus={() => setSearch("")}
        onBlur={() => setOpen(false)}
        onTouchCancel={() => setOpen(false)}
        {...props}
      />
      <View
        className="relative pt-4 w-full"
        style={{ zIndex }}
      >
        {open
              && (
              <View
                className="absolute bg-gray-100 rounded-md w-full max-h-72 shadow"
                style={{ shadowColor: "black", shadowOpacity: 1 }}
              >
                <ItemList items={items} loading={loading} onSelect={onSelect} />
              </View>
              )}
      </View>
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
    return <ActivityIndicator className="text-gray-600 p-2" />;
  }

  if (items.length === 0) {
    return <AppText className="text-gray-600 p-2">Aucun résultat</AppText>;
  }

  return (
    <FlatList
      keyboardShouldPersistTaps="always"
      data={items}
      keyExtractor={(i) => i.id!}
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
    <AppText className="text-2xl text-gray-700 p-2">{item.label}</AppText>
  </TouchableOpacity>
);
