/** Same binary-heap approach as taxi's offline router. */
export class RouteQueue {
  private values: [number, string][] = [];

  push(score: number, id: string) {
    const values = this.values, item: [number, string] = [score, id];
    let index = values.length;
    values.push(item);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (values[parent][0] <= score) break;
      values[index] = values[parent];
      index = parent;
    }
    values[index] = item;
  }

  pop(): [number, string] | undefined {
    const values = this.values, first = values[0], tail = values.pop();
    if (!values.length || !tail) return first;
    let index = 0;
    while (index * 2 + 1 < values.length) {
      let child = index * 2 + 1;
      if (child + 1 < values.length && values[child + 1][0] < values[child][0]) child++;
      if (values[child][0] >= tail[0]) break;
      values[index] = values[child];
      index = child;
    }
    values[index] = tail;
    return first;
  }
}
