import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQuery } from "react-query";
import { AppText } from "@/components/base/AppText";

export interface WithFetchResourceProps<T> {
  data: T
}

/**
 * Higher order component that shows a spinner while fetching data asynchronously and displays an error when necessary.
 * @param WrappedComponent the component receiving the data. Props should extend WithFetchResourceProps.
 * @param loadData the callback to fetch the data.
 * @param queryKey a key used for caching
 */
// eslint-disable-next-line @typescript-eslint/comma-dangle
export const WithFetchResource = <T,>(WrappedComponent, loadData: () => Promise<T>, queryKey: string) => (props: any) => {

  const { isLoading, error, data } = useQuery(queryKey, () => loadData());
  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (error) {
    return (
      <View style={styles.container}>
        <AppText style={{ textAlign: "center" }}>
          Error:
          {error.message}
        </AppText>
      </View>
    );
  }
  return (<WrappedComponent {...props} data={data} />);

};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    alignContent: "center",
    justifyContent: "center"
  }
});