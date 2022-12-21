import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppText } from "@/components/base/AppText";

export interface WithFetchResourceProps<T> {
  data: T
}

/**
 * Higher order component that shows a spinner while fetching data asynchronously and displays an error when necessary.
 * @param WrappedComponent the component receiving the data. Props should extend WithFetchResourceProps.
 * @param loadData the callback to fetch the data.
 */
// eslint-disable-next-line @typescript-eslint/comma-dangle
export const WithFetchResource = <T,>(WrappedComponent, loadData: () => Promise<T>) => (props: any) => {

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T>();
  async function fetch() {
    try {
      setLoading(true);
      setData(await loadData());

    } catch (e: Error) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetch();
  }, []);

  if (loading) {
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
          {error}
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