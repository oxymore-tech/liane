export type Observer<T> = (value: T) => Promise<void>;

export interface Observable<T> {
  subscribe(observer: Observer<T>): Promise<void>;
  unsubscribe(observer: Observer<T>): void;
}

export class Subject<T> implements Observable<T> {

    private observers: Observer<T>[] = [];

    private value: T;

    constructor(initialValue: T) {
      this.value = initialValue;
    }

    public async subscribe(observer: Observer<T>) {
      this.observers.push(observer);
      return observer(this.value);
    }

    public unsubscribe(observer: Observer<T>) {
      this.observers.filter((o) => o !== observer);
    }

    public update(value: T) {
      this.value = value;
      this.notifyAll();
    }

     private notifyAll = () => {
       this.observers.forEach((o) => o(this.value));
     }

}