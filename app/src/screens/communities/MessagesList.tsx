import { SectionList, ViewToken } from "react-native";
import { RefreshControl } from "react-native-gesture-handler";
import { AppText } from "@/components/base/AppText.tsx";
import { ArrayUtils, capitalize, CoLiane, LianeMessage, User } from "@liane/common";
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
};

export const MessageList = ({ liane, user, messages, loading, fetchMessages, fetchNextPage }: MessageListProps) => {
  const [stickyHeader, setStickyHeader] = useState<string>();

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

  const handleStickyHeader = useCallback(({ viewableItems }: { viewableItems: ViewToken<LianeMessage>[]; changed: ViewToken<LianeMessage>[] }) => {
    if (!viewableItems?.length) {
      return;
    }
    const lastItem = viewableItems.pop();
    if (lastItem && lastItem.section) {
      setStickyHeader(lastItem.section.title);
    }
  }, []);

  return (
    <>
      {stickyHeader && <Header title={stickyHeader} fixed={true} />}
      <SectionList
        sections={sections}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchMessages} />}
        style={{ flex: 1, paddingHorizontal: 16 }}
        keyExtractor={m => m.id!}
        renderSectionFooter={({ section }) => <Header title={section.title} />}
        renderItem={({ item, index, section }) => {
          const renderSender = index === section.data.length - 1 || section.data[index + 1].createdBy !== item.createdBy;

          return <MessageBubble liane={liane} message={item} isSender={item.createdBy === user?.id} renderSender={renderSender} />;
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
  return (
    <Center style={[{ width: "100%" }, fixed && { position: "absolute", zIndex: 5 }]}>
      <AppText
        style={{ color: AppColorPalettes.gray[700], backgroundColor: AppColorPalettes.gray[300], padding: 8, borderRadius: 16, marginBottom: 8 }}>
        {capitalize(AppLocalization.formatDateUserFriendly(new Date(title)))}
      </AppText>
    </Center>
  );
};
