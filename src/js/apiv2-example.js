import React, { useState, useCallback, useRef, useContext, useEffect } from 'react'
import { Editor } from '@monaco-editor/react'
import TabItem from '@theme/TabItem'
import Admonition from '@theme/Admonition'
import { Icon } from '@iconify/react'
import stringify from 'json-stringify-pretty-compact'

import Tabs from '../theme/Tabs'
import Examples from './examples'
import { SiteContext } from './sites'

const MIN_HEIGHT = 170
const MAX_HEIGHT = 500

export default function ApiV2Example(props) {
  const { isLoggedIn, sites, selectedSite, selectSite } = useContext(SiteContext)

  const [activeTab, setActiveTab] = useState("query")
  const [code, setCode] = useState(getCode(props.request, selectedSite))
  const [canReset, setCanReset] = useState(false)
  const [response, setResponse] = useState(null)

  useEffect(() => {
    if (!canReset && isLoggedIn) {
      setCode(getCode(props.request, selectedSite))
    }
  }, [selectedSite, canReset, isLoggedIn])

  const onCodeChange = useCallback((code) => {
    setCode(code)
    setCanReset(true)
    setResponse(null)
  })

  const resetCode = useCallback(() => {
    setCode(getCode(props.request, selectedSite))
    setCanReset(false)
    setResponse(null)
  })

  const copyCode = useCallback(() => {
    navigator.clipboard.writeText(code)
  })

  const runCode = useCallback(async () => {
    setResponse(null)
    const [response, data] = await postQuery(code)

    setResponse({
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      data
    })

    setActiveTab("response")
  })

  return (
    <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
      <TabItem label="Query" value="query">
        <div style={{ position: "relative" }}>
          <JsonSchemaEditor
            schema="/api/docs/query/schema.json"
            value={code}
            onChange={onCodeChange}
            readOnly={!isLoggedIn}
          />
          <div style={{ position: "absolute", top: 2, right: 2, display: "flex" }}>
            {canReset && (
              <button title="Reset query" className="code-button" onClick={resetCode}>
                <Icon icon="carbon:reset-alt" />
              </button>
            )}
            <button title="Copy query" className="code-button" onClick={copyCode}>
              <Icon icon="ant-design:copy-outlined" />
            </button>
            {isLoggedIn && (
              <select
                value={selectedSite}
                onChange={(e) => selectSite(e.target.value)}
                className="site-select"
                title="Site to run query against"
              >
                {sites.map((siteDomain) => (<option key={siteDomain} value={siteDomain}>{siteDomain}</option>))}
              </select>
            )}
            {isLoggedIn && (
              <button title="Run query" className="code-button" onClick={runCode}>
                <Icon icon="ant-design:code-outlined" />
              </button>
            )}
          </div>
        </div>
      </TabItem>
      <TabItem label="Example Response" value="example_response">
        <Admonition type="info">
          <p>Example response for this query</p>
        </Admonition>

        <JsonSchemaEditor
          readOnly
          value={getCode(props.response, selectedSite)}
        />
      </TabItem>
      {response && (
        <TabItem label="Response" value="response">
          <Admonition type="info">
            {/* <p><code>POST /api/v2/query</code></p> */}
            <p>Status: <code>{response.status}</code> - <code>{response.statusText}</code></p>
          </Admonition>

          {response.data !== "" && (
            <JsonSchemaEditor
              readOnly
              value={response.data}
            />)}
        </TabItem>
      )}
    </Tabs>
  )
}

function JsonSchemaEditor({ value, schema, onChange, readOnly }) {
  const [height, setHeight] = useState(MIN_HEIGHT)
  const editorRef = useRef()

  const onMount = useCallback((editor, monaco) => {
    editorRef.current = editor

    if (schema) {
      monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
        validate: true,
        schemas: [{
          uri: `${window.location.origin}${schema}`,
          fileMatch: ["*"],
        }],
        enableSchemaRequest: true
      })
    }
    editor.onDidChangeModelContent(handleEditorChange)
    handleEditorChange()
  })

  const handleEditorChange = useCallback(() => {
    const editAreaHeight = editorRef.current.getContentHeight()
    if (editAreaHeight > height && height < MAX_HEIGHT) {
      setHeight(editAreaHeight)
    }
  }, []);

  return (
    <Editor
      theme="vs-dark"
      language="json"
      value={value}
      height={height}
      options={{
        minimap: {
          enabled: false,
        },
        automaticLayout: true,
        fixedOverflowWidgets: true,
        glyphMargin: false,
        wordWrap: 'off',
        lineNumbers: 'on',
        tabFocusMode: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: false,
        scrollBeyondLastLine: false,
        readOnly: readOnly
      }}
      onMount={onMount}
      onChange={onChange}
    />
  )
}

async function postQuery(query) {
  let response
  try {
    response = await fetch('/api/docs/query', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: query
    })

  } catch (error_response) {
    response = error_response
  }

  try {
    const data = await response.json()

    return [response, stringify(data)]
  } catch (error) {
    return [response, ""]
  }
}

function getCode(name, selectedSite) {
  let exampleCode = Examples[name] || ""

  if (selectedSite) {
    exampleCode = exampleCode.replace("dummy.site", selectedSite)
  }

  return exampleCode
}
