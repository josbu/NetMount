import { useTaskStore } from '../../stores/useTaskStore'
import {
  Button,
  Grid,
  Link,
  Modal,
  Space,
  Table,
  TableColumnProps,
  Typography,
} from '@arco-design/web-react'
import { useTranslation } from 'react-i18next'
import { nmConfig, roConfig } from '../../services/ConfigService'
import { logger } from '../../services'
import { useNavigate } from 'react-router-dom'
import { delTask, taskScheduler } from '../../controller/task/task'
import { NoData_module } from '../other/noData'
import { IconQuestionCircle } from '@arco-design/web-react/icon'
import { openUrlInBrowser } from '../../utils'
import { showLog } from '../other/modal'

const Row = Grid.Row
const Col = Grid.Col

function Task_page() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { increment: incrementTask } = useTaskStore()
  const [modal, contextHolder] = Modal.useModal()

  const columns: TableColumnProps[] = [
    {
      title: t('task_name'),
      dataIndex: 'name',
      width: '20%',
      ellipsis: true,
    },
    {
      title: t('state'),
      dataIndex: 'state',
      width: '5rem',
    },
    {
      title: t('cycle'),
      dataIndex: 'cycle',
      width: '5rem',
    },
    {
      title: t('run_info'),
      dataIndex: 'runInfo',
      ellipsis: true,
    },
    {
      title: t('actions'),
      dataIndex: 'actions',
      align: 'right',
      width: '14rem',
    },
  ]
  logger.debug('Task config loaded', 'Task', { taskConfig: nmConfig.task })

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {contextHolder}
      <Row style={{ width: '100%', height: '2rem' }}>
        <Col flex={'auto'}>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                navigate('/task/add')
              }}
            >
              {t('add')}
            </Button>
            <Button
              onClick={() => {
                incrementTask()
              }}
            >
              {t('refresh')}
            </Button>
          </Space>
        </Col>
        <Col flex={'4rem'} style={{ textAlign: 'right' }}>
          <Button
            title={t('help')}
            icon={<IconQuestionCircle />}
            onClick={() => {
              openUrlInBrowser(roConfig.url.docs + '/docs/task')
            }}
          />
        </Col>
      </Row>
      <div style={{ height: 'calc(100% - 3rem)', marginTop: '1rem' }}>
        <Table
          columns={columns}
          noDataElement={<NoData_module />}
          data={nmConfig.task.map(taskItem => {
            return {
              ...taskItem,
              state: taskItem.enable ? t('enabled') : t('disabled'),
              cycle: t('task_run_mode_' + taskItem.run.mode),
              runInfo: (
                <Link
                  style={{ width: '100%' }}
                  onClick={() => {
                    showLog(modal, taskItem.runInfo?.msg || t('none'))
                  }}
                >
                  <Typography.Ellipsis>
                    {' '}
                    {(taskItem.runInfo?.msg || t('none')).split('\n').pop()}
                  </Typography.Ellipsis>
                </Link>
              ),
              actions: (
                <Space>
                  {taskItem.enable ? (
                    <>
                      <Button
                        onClick={() => {
                          taskScheduler.cancelTask(taskItem.name)
                          taskItem.enable = false
                          setTimeout(() => {
                            incrementTask()
                          }, 200)
                        }}
                        status="danger"
                      >
                        {t('disable')}
                      </Button>

                      <Button
                        onClick={() => {
                          taskScheduler.executeTask(taskItem.name)
                          setTimeout(() => {
                            incrementTask()
                          }, 200)
                        }}
                      >
                        {t('trigger')}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => {
                          delTask(taskItem.name)
                          incrementTask()
                        }}
                        status="danger"
                      >
                        {t('delete')}
                      </Button>
                      <Button
                        onClick={() => {
                          navigate('./add/?edit=true&taskName=' + taskItem.name)
                        }}
                      >
                        {t('edit')}
                      </Button>
                      <Button
                        onClick={() => {
                          taskItem.enable = true
                          taskScheduler.addTask(taskItem)
                          setTimeout(() => {
                            incrementTask()
                          }, 200)
                        }}
                        type="primary"
                      >
                        {t('enable')}
                      </Button>
                    </>
                  )}
                </Space>
              ),
            }
          })}
        />
      </div>
    </div>
  )
}

export { Task_page }
