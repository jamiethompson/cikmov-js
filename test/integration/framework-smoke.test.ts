import { Injectable } from "@angular/core";
import React from "react";
import { computed, ref } from "vue";
import { normalise } from "../../src/index";

describe("framework compatibility smoke", () => {
  it("works inside a Vue-style computed flow", () => {
    const postcode = ref("ec1a ial");
    const result = computed(() => normalise(postcode.value));

    expect(result.value.normalised).toBe("EC1A 1AL");
    expect(result.value.isCorrected).toBe(true);
  });

  it("works in a React component function", () => {
    const PostcodeLabel = ({ input }: { input: string }) => {
      const value = normalise(input);
      return React.createElement("span", null, value.normalised);
    };

    const rendered = PostcodeLabel({ input: "yo1 7h1" });
    expect(rendered.props.children).toBe("YO1 7HL");
  });

  it("works in an Angular injectable service", () => {
    @Injectable({ providedIn: "root" })
    class PostcodeService {
      public normalise(input: string): string | null {
        return normalise(input).normalised;
      }
    }

    const service = new PostcodeService();
    expect(service.normalise("EC1A IAL")).toBe("EC1A 1AL");
  });
});
