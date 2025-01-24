import { SectionList, ViewToken } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { AppText } from "@/components/base/AppText.tsx";
import { ArrayUtils, capitalize, CoLiane, IncomingTrip, LianeMessage, User } from "@liane/common";
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

export const MessageList = ({ liane, user, messages, loading, fetchMessages, fetchNextPage, incomingTrips }: MessageListProps) => {
  const [stickyHeader, setStickyHeader] = useState<string>();
  const [stillVisible, setStillVisible] = useState(false);

  const sections = useMemo(() => {
    return Object.entries(
      ArrayUtils.groupBy(messages, m => {
        const date = new Date(m.createdAt!);
        date.setHours(12, 0, 0, 0);
        return date.toISOString();
      })
    ).map(([date, g]) => ({
      title: date,
      data: g
    }));
  }, [messages]);

  const firstSection = useMemo(() => {
    if (sections.length === 0) {
      return;
    }
    return sections[0].title;
  }, [sections]);

  const handleStickyHeader = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken<LianeMessage>[]; changed: ViewToken<LianeMessage>[] }) => {
      if (!viewableItems?.length) {
        return;
      }

      const lastItem = viewableItems.pop();
      if (!lastItem) {
        return;
      }

      setStillVisible(firstSection !== lastItem.section.title);
      setStickyHeader(lastItem.section.title);
    },
    [firstSection]
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
      {stickyHeader && stillVisible && <Header title={stickyHeader} fixed={true} />}
      <SectionList
        sections={sections}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMessages} />}
        style={{ flex: 1 }}
        keyExtractor={m => m.id!}
        renderSectionFooter={({ section }) => <Header title={section.title} />}
        renderItem={({ item, index, section }) => {
          const renderSender = index === section.data.length - 1 || section.data[index + 1].createdBy !== item.createdBy;

          return (
            <MessageBubble
              liane={liane}
              message={item}
              isSender={item.createdBy === user?.id}
              renderSender={renderSender}
              activeTrips={activeTrips}
            />
          );
        }}
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
