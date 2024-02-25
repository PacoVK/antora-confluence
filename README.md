# Captain - Confluence Antora Plugin To Aid Integration Nicely

> NOTE: This plugin is in an early phase. It is still in development.

![Captain Logo](assets/captain.png)

This plugin is designed to help to publish your [Antora](https://antora.org/) docs into Confluence. The main reason is, that we want to have a single source of truth for our documentation. We want to write our documentation in AsciiDoc and publish it to Confluence as some of our Stakeholders are using Confluence.

## References and Kudos

The code of the plugin was heavily inspired by [docToolchain](https://doctoolchain.org/docToolchain/v2.0.x/), a swiss-army knife for docs-as-code.

## How it works

The plugin uses the Confluence REST API to create and update pages in Confluence. It uses the `confluence-space` to determine where to publish the pages. The plugin will create a page for each Antora page and will use the `title` and `content` of the page to create the Confluence page.

The plugin will also create a `page-tree` to reflect the structure of the Antora pages in Confluence. Each Antora module version will be a child page of the `page-tree` and the pages will be children of the module pages.

## Installation

To install the plugin, you can use the following command in your Antora project:

```sh
npm install -D antora-confluence
```

or using yarn:

```sh
yarn add -D antora-confluence
```

## Usage

To use the plugin, you need to add it to your Antora project. You can do this by adding the following to your output section in `playbook.yml`:

```yaml
output:
  destinations:
    - provider: antora-confluence
      confluence-api: https://<redacted>.atlassian.net
      confluence-space: my-spacekey
```

For full reference, please head over to the [docs](https://docs.antora.org/antora/latest/playbook/configure-output/).

### Configuration

| Option           | Description                                                                                                                  | Info                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| confluence-api   | URL to your Confluence API endpoint                                                                                          | **required**               |
| confluence-space | The Confluence space key to publish the pages to                                                                             | **required**               |
| editor-version   | The Confluence editor version to use to create pages                                                                         | v1 (default) / v2          |
| filters          | Specify paths or files that you want to publish to Confluence                                                                | [] (default)               |
| ancestor-id      | Specify the overall parent page for your docs. Needs to be the pageId of the parent page, not the DisplayName.               | defaults to the space root |
| show-banner      | Specify if all your pages should contain an info banner, that this pages were created by automation and changes may be lost. | false (default)            |

#### Filters

You can specify filters to only push certain files or folders instead of all. The filters must match the natural output structure of Antora. You can specify as many filters as you need. There are two different types of filters: `PathFilter` and `FileFilter`.

To filter on a **specific directory**:

> Info: The below example would only publish all files within the folders `module-a/1.0/example` and `module-c/2.1/foo`

```yaml
output:
  destinations:
    - provider: antora-confluence
      confluence-api: https://<redacted>.atlassian.net
      confluence-space: my-spacekey
      filters:
        - path: module-a/1.0/example
        - path: module-c/2.1/foo
```

To filter on **specific files**:

> Info: The below example would only publish the three files, specfied by the filter

```yaml
output:
  destinations:
    - provider: antora-confluence
      confluence-api: https://<redacted>.atlassian.net
      confluence-space: my-spacekey
      filters:
        - files:
            - module-a/1.0/example/manual.html
            - module-a/1.0/example/troubleshoot.html
            - module-c/1.0/foo/examples.html
```

### Authentication

The plugin uses the `CONFLUENCE_USERNAME` and `CONFLUENCE_PASSWORD` to authenticate with the Confluence API. You can set these values in the environment variables.

#### Logging

You can set the log level of the plugin by setting the `LOG_LEVEL` environment variable. The following levels are available:

- debug
- info (**default**)
- warn

## Planned Roadmap

- [ ] Handle embedded images

## Contributing

Contributions in any area are welcome. Please open an issue or a pull request.
