import { describe, it, expect, beforeEach } from "vitest";
import { useUiPrefs, clampSplitterRatio, nextMatchFilter } from "./ui-prefs";

describe("ui-prefs store", () => {
  beforeEach(() => {
    useUiPrefs.setState({
      lineFilter: null,
      layerVisibility: {
        paragraph: true,
        line: true,
        word: true,
      },
      splitterRatio: 0.5,
      selectionMode: "paragraph",
      matchFilter: "unvalidated",
    });
  });

  describe("initialization", () => {
    it("initialises with default values", () => {
      const store = useUiPrefs.getState();
      expect(store.lineFilter).toBeNull();
      expect(store.layerVisibility).toEqual({
        paragraph: true,
        line: true,
        word: true,
      });
      expect(store.splitterRatio).toBe(0.5);
      expect(store.selectionMode).toBe("paragraph");
      expect(store.matchFilter).toBe("unvalidated");
    });
  });

  describe("matchFilter updates (spec 22 §8)", () => {
    it("setMatchFilter writes the value", () => {
      useUiPrefs.setMatchFilter("mismatched");
      expect(useUiPrefs.getState().matchFilter).toBe("mismatched");
    });

    it("cycleMatchFilter advances unvalidated → mismatched", () => {
      useUiPrefs.setMatchFilter("unvalidated");
      useUiPrefs.cycleMatchFilter();
      expect(useUiPrefs.getState().matchFilter).toBe("mismatched");
    });

    it("cycleMatchFilter advances mismatched → all", () => {
      useUiPrefs.setMatchFilter("mismatched");
      useUiPrefs.cycleMatchFilter();
      expect(useUiPrefs.getState().matchFilter).toBe("all");
    });

    it("cycleMatchFilter advances all → unvalidated (wraps)", () => {
      useUiPrefs.setMatchFilter("all");
      useUiPrefs.cycleMatchFilter();
      expect(useUiPrefs.getState().matchFilter).toBe("unvalidated");
    });

    it("three cycle calls return to the starting state", () => {
      useUiPrefs.setMatchFilter("unvalidated");
      useUiPrefs.cycleMatchFilter();
      useUiPrefs.cycleMatchFilter();
      useUiPrefs.cycleMatchFilter();
      expect(useUiPrefs.getState().matchFilter).toBe("unvalidated");
    });
  });

  describe("nextMatchFilter helper", () => {
    it("advances unvalidated → mismatched → all → unvalidated", () => {
      expect(nextMatchFilter("unvalidated")).toBe("mismatched");
      expect(nextMatchFilter("mismatched")).toBe("all");
      expect(nextMatchFilter("all")).toBe("unvalidated");
    });
  });

  describe("lineFilter updates", () => {
    it("updates lineFilter", () => {
      useUiPrefs.setState({ lineFilter: "paragraph_id_123" });
      expect(useUiPrefs.getState().lineFilter).toBe("paragraph_id_123");
    });

    it("clears lineFilter by setting to null", () => {
      useUiPrefs.setState({ lineFilter: "paragraph_id_123" });
      useUiPrefs.setState({ lineFilter: null });
      expect(useUiPrefs.getState().lineFilter).toBeNull();
    });
  });

  describe("layerVisibility updates", () => {
    it("toggles paragraph visibility", () => {
      useUiPrefs.setState((state) => ({
        layerVisibility: {
          ...state.layerVisibility,
          paragraph: false,
        },
      }));
      expect(useUiPrefs.getState().layerVisibility.paragraph).toBe(false);
    });

    it("toggles line visibility", () => {
      useUiPrefs.setState((state) => ({
        layerVisibility: {
          ...state.layerVisibility,
          line: false,
        },
      }));
      expect(useUiPrefs.getState().layerVisibility.line).toBe(false);
    });

    it("toggles word visibility", () => {
      useUiPrefs.setState((state) => ({
        layerVisibility: {
          ...state.layerVisibility,
          word: false,
        },
      }));
      expect(useUiPrefs.getState().layerVisibility.word).toBe(false);
    });

    it("updates multiple layer visibilities at once", () => {
      useUiPrefs.setState({
        layerVisibility: {
          paragraph: false,
          line: true,
          word: false,
        },
      });
      const visibility = useUiPrefs.getState().layerVisibility;
      expect(visibility.paragraph).toBe(false);
      expect(visibility.line).toBe(true);
      expect(visibility.word).toBe(false);
    });
  });

  describe("splitterRatio updates", () => {
    it("updates splitterRatio via setState", () => {
      useUiPrefs.setState({ splitterRatio: 0.7 });
      expect(useUiPrefs.getState().splitterRatio).toBe(0.7);
    });

    it("setSplitterRatio writes the value", () => {
      useUiPrefs.setSplitterRatio(0.6);
      expect(useUiPrefs.getState().splitterRatio).toBe(0.6);
    });

    it("setSplitterRatio clamps below 0.2 up to 0.2", () => {
      useUiPrefs.setSplitterRatio(0.05);
      expect(useUiPrefs.getState().splitterRatio).toBe(0.2);
    });

    it("setSplitterRatio clamps above 0.8 down to 0.8", () => {
      useUiPrefs.setSplitterRatio(0.95);
      expect(useUiPrefs.getState().splitterRatio).toBe(0.8);
    });

    it("setSplitterRatio resets NaN to default 0.5", () => {
      useUiPrefs.setSplitterRatio(Number.NaN);
      expect(useUiPrefs.getState().splitterRatio).toBe(0.5);
    });
  });

  describe("clampSplitterRatio helper", () => {
    it("passes values inside the range unchanged", () => {
      expect(clampSplitterRatio(0.5)).toBe(0.5);
      expect(clampSplitterRatio(0.2)).toBe(0.2);
      expect(clampSplitterRatio(0.8)).toBe(0.8);
    });

    it("clamps low / high", () => {
      expect(clampSplitterRatio(-0.5)).toBe(0.2);
      expect(clampSplitterRatio(1.5)).toBe(0.8);
    });

    it("returns default 0.5 for NaN", () => {
      expect(clampSplitterRatio(Number.NaN)).toBe(0.5);
    });
  });

  describe("selectionMode updates", () => {
    it("updates selectionMode to line", () => {
      useUiPrefs.setState({ selectionMode: "line" });
      expect(useUiPrefs.getState().selectionMode).toBe("line");
    });

    it("updates selectionMode to word", () => {
      useUiPrefs.setState({ selectionMode: "word" });
      expect(useUiPrefs.getState().selectionMode).toBe("word");
    });

    it("defaults to paragraph mode", () => {
      expect(useUiPrefs.getState().selectionMode).toBe("paragraph");
    });
  });

  describe("state persistence", () => {
    it("maintains state across multiple updates", () => {
      useUiPrefs.setState({
        lineFilter: "test_filter",
        splitterRatio: 0.6,
      });
      useUiPrefs.setState({ selectionMode: "line" });

      const state = useUiPrefs.getState();
      expect(state.lineFilter).toBe("test_filter");
      expect(state.splitterRatio).toBe(0.6);
      expect(state.selectionMode).toBe("line");
    });
  });
});
