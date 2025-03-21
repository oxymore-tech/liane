import { FlatList, ViewToken } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { AppText } from "@/components/base/AppText.tsx";
import { capitalize, CoLiane, IncomingTrip, LianeMessage, Trip, User } from "@liane/common";
import { AppLocalization } from "@/api/i18n.ts";
import { MessageBubble } from "@/screens/communities/MessageBubble.tsx";
import React, { useCallback, useMemo, useState } from "react";
import { AppColorPalettes } from "@/theme/colors.ts";
import { Center } from "@/components/base/AppLayout.tsx";

type MessageListProps = {
  liane?: CoLiane;
  user?: User;
  messages: LianeMessage[];
  loading: boolean;
  fetchMessages: () => void;
  fetchNextPage: () => void;
  incomingTrips?: Record<string, IncomingTrip[]>;
};

function isWithinLastWeek(date: Date) {
  const now = new Date(); // Current date and time
  const today = now.getDay(); // Get the current day of the week (0 = Sunday, 6 = Saturday)

  // Calculate the start of "last week" (excluding today's weekday from last week)
  const startOfLastWeek = new Date();
  startOfLastWeek.setDate(now.getDate() - 7 - today + 1); // Last week's Monday (or start of last week)

  return date >= startOfLastWeek;
}

type LianeSection = {
  title: string;
};

type LianeMessageWithRenderSender = LianeMessage & { renderSender: boolean };

type MessageItem = LianeMessageWithRenderSender | LianeSection;

function isSection(m: LianeMessage | LianeSection): m is LianeSection {
  return (m as any).title !== undefined;
}

function getMessageTitle(message: LianeMessage) {
  const date = new Date(message.createdAt!);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

export const MessageList = ({ liane, user, messages, loading, fetchMessages, fetchNextPage, incomingTrips }: MessageListProps) => {
  const [stickyHeader, setStickyHeader] = useState<string>();

  const items = useMemo(() => {
    const array: MessageItem[] = [];
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const previousMessage = messages[i + 1];
      const title = getMessageTitle(message);

      const firstOfSection = !previousMessage || title !== getMessageTitle(previousMessage);

      const renderSender = firstOfSection || previousMessage.content.type !== "Text" || previousMessage.createdBy !== message.createdBy;
      array.push({ ...message, renderSender: renderSender });

      if (firstOfSection) {
        array.push({ title });
      }
    }
    return array;
  }, [messages]);

  const handleStickyHeader = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<LianeMessage | LianeSection>[]; changed: ViewToken<LianeMessage | LianeSection>[] }) => {
      const visibleTitles = new Set(viewableItems.filter(v => v.isViewable && isSection(v.item)).map(v => (v.item as LianeSection).title));
      let lastItem = viewableItems.pop();
      if (!lastItem) {
        return;
      }
      lastItem = viewableItems.pop();
      if (!lastItem) {
        return;
      }
      if (isSection(lastItem.item)) {
        lastItem = viewableItems.pop();
        if (!lastItem) {
          return;
        }
      }

      if (isSection(lastItem.item)) {
        return;
      }

      const messageTitle = getMessageTitle(lastItem.item);
      if (visibleTitles.has(messageTitle)) {
        setStickyHeader(undefined);
      } else {
        setStickyHeader(messageTitle);
      }
    },
    []
  );

  const activeTrips = useMemo(() => {
    if (!incomingTrips) {
      return [];
    }

    return Object.fromEntries(
      Object.values(incomingTrips)
        .flatMap(t => t)
        .map(t => [t.trip.id, t.trip])
    );
  }, [incomingTrips]);

  return (
    <>
      {stickyHeader && <Header title={stickyHeader} fixed={true} />}
      <FlatList
        data={items}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMessages} />}
        style={{ flex: 1 }}
        keyExtractor={m => {
          if (isSection(m)) {
            return m.title;
          }
          return m.id!;
        }}
        renderItem={({ item }) => <RenderItem item={item} activeTrips={activeTrips} user={user} liane={liane} />}
        onViewableItemsChanged={handleStickyHeader}
        onEndReachedThreshold={0.2}
        onEndReached={fetchNextPage}
        inverted
      />
    </>
  );
};

type HeaderProps = {
  title: string;
  fixed?: boolean;
};

const Header = ({ title, fixed }: HeaderProps) => {
  const date = useMemo(() => {
    const sectionDate = new Date(title);

    if (isWithinLastWeek(sectionDate)) {
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      if (sectionDate.getDate() === today.getDate()) {
        return "Aujourd'hui";
      }

      if (sectionDate.getDate() === yesterday.getDate()) {
        return "Hier";
      }

      return capitalize(AppLocalization.formatDay(sectionDate));
    }
    return capitalize(AppLocalization.formatDateUserFriendly(sectionDate));
  }, [title]);

  return (
    <Center style={[{ width: "100%" }, fixed && { position: "absolute", zIndex: 5 }]}>
      <AppText
        style={{ color: AppColorPalettes.gray[700], backgroundColor: AppColorPalettes.gray[300], padding: 8, borderRadius: 16, marginBottom: 6 }}>
        {date}
      </AppText>
    </Center>
  );
};

type RenderItemProps = {
  item: MessageItem;
  liane?: CoLiane;
  user?: User;
  activeTrips: Record<string, Trip>;
};

const RenderItem = ({ item, liane, user, activeTrips }: RenderItemProps) => {
  if (isSection(item)) {
    return <Header title={item.title} />;
  }
  return (
    <MessageBubble liane={liane} message={item} isSender={item.createdBy === user?.id} renderSender={item.renderSender} activeTrips={activeTrips} />
  );
};
