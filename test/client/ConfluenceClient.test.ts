import { describe, expect, it } from "@jest/globals";
import ConfluenceClientStub from "./ConfluenceClientStub";

describe("ConfluenceClient", () => {
  const config = {
    spaceKey: "SPACE",
    ancestorId: "12345",
    editorVersion: "v1",
  };

  it("should initialize the confluence client correctly with full API path", () => {
    const confluenceClient = new ConfluenceClientStub({
      ...config,
      baseUrl: new URL("https://confluence.example.com/rest/api"),
    });
    expect(confluenceClient.BASE_URL.toString()).toBe(
      "https://confluence.example.com/",
    );
    expect(confluenceClient.API_V1_PATH).toBe("/rest/api");
    expect(confluenceClient.API_V2_PATH).toBe("/api/v2");
  });

  it("should initialize the confluence client correctly with default context", () => {
    const confluenceClient = new ConfluenceClientStub({
      ...config,
      baseUrl: new URL("https://confluence.example.com"),
    });
    expect(confluenceClient.BASE_URL.toString()).toBe(
      "https://confluence.example.com/",
    );
    expect(confluenceClient.API_V1_PATH).toBe("/wiki/rest/api");
    expect(confluenceClient.API_V2_PATH).toBe("/wiki/api/v2");
  });

  it("should initialize the confluence client correctly with trailing slash", () => {
    const confluenceClient = new ConfluenceClientStub({
      ...config,
      baseUrl: new URL("https://confluence.example.com/"),
    });
    expect(confluenceClient.BASE_URL.toString()).toBe(
      "https://confluence.example.com/",
    );
    expect(confluenceClient.API_V1_PATH).toBe("/wiki/rest/api");
    expect(confluenceClient.API_V2_PATH).toBe("/wiki/api/v2");
  });

  it("should initialize the confluence client correctly with custom context", () => {
    const confluenceClient = new ConfluenceClientStub({
      ...config,
      baseUrl: new URL("https://confluence.example.com/custom"),
    });
    expect(confluenceClient.BASE_URL.toString()).toBe(
      "https://confluence.example.com/",
    );
    expect(confluenceClient.API_V1_PATH).toBe("/custom/rest/api");
    expect(confluenceClient.API_V2_PATH).toBe("/custom/api/v2");
  });
});
