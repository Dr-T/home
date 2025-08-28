<template>
  <div v-if="homeSiteLinks.length" class="links">
    <div class="line">
      <Icon size="24" style="transform: translateY(1px)">
        <Apps />
      </Icon>
      <span class="title">产品列表</span>
      <div class="all-button" @click="showAllSites = true" style="transform: translateY(2px)">
        <Icon size="20">
          <EllipsisHorizontal />
        </Icon>
        <span class="text" style="font-size: 16px;">全部</span>
      </div>
    </div>
    <!-- 产品列表 -->
    <Swiper
      v-if="homeSiteLinks.length"
      :modules="[Pagination, Mousewheel]"
      :slides-per-view="1"
      :space-between="40"
      :pagination="{
        el: '.swiper-pagination',
        clickable: true,
        bulletElement: 'div',
      }"
      :mousewheel="true"
    >
    <SwiperSlide v-for="site in siteLinksList" :key="site">
        <el-row class="link-all" :gutter="20">
          <el-col v-for="(item, index) in site" :span="8" :key="item">
            <div
              class="item cards"
              :style="index < 3 ? 'margin-bottom: 20px' : null"
              @click="jumpLink(item)"
              @mouseenter="showTooltip($event, item)"
              @mouseleave="hideTooltip"
            >
              <div v-if="item.status" :class="['status-badge', `status-${item.status}`]"></div>
              <Icon size="26">
                <component :is="siteIcon[item.icon]" />
              </Icon>
              <span class="name text-hidden">{{ item.name }}</span>
            </div>
          </el-col>
        </el-row>
      </SwiperSlide>
      <div class="swiper-pagination" />
    </Swiper>
    <!-- 全部网站 -->
    <Transition name="fade">
      <div
        v-if="showAllSites"
        class="all-sites"
        @click="showAllSites = false"
      >
        <div class="modal" @click.stop>
          <div class="title">
            <Icon size="24">
              <Apps />
            </Icon>
            <span>产品列表</span>
            <Icon
              class="close"
              size="24"
              @click="showAllSites = false"
            >
              <Close />
            </Icon>
          </div>
          <div class="all-list">
            <div class="tabs">
              <div
                v-for="tab in Object.keys(allSiteLinks)"
                :key="tab"
                :class="{ tab: true, active: activeTab === tab }"
                @click="handleTabClick(tab)"
              >
                {{ tab }}
              </div>
            </div>
            <div class="content">
              <div v-if="protectedGroups.includes(activeTab) && !unlockedGroups.includes(activeTab)" class="locked-content">
                <Icon size="48"><component :is="siteIcon.AddressCardRegular" /></Icon>
                <p>此分组内容已被保护</p>
              </div>
              <el-row v-else class="link-all" :gutter="20">
                <el-col
                  v-for="item in allSiteLinks[activeTab]"
                  :key="item"
                  :span="8"
                >
                  <div
                    class="item cards"
                    @click="jumpLink(item)"
                    @mouseenter="showTooltip($event, item)"
                    @mouseleave="hideTooltip"
                  >
                    <div v-if="item.status" :class="['status-badge', `status-${item.status}`]"></div>
                    <Icon size="26">
                      <component :is="siteIcon[item.icon]" />
                    </Icon>
                    <span class="name text-hidden">{{ item.name }}</span>
                  </div>
                </el-col>
              </el-row>
            </div>
          </div>
        </div>
      </div>
    </Transition>
    <!-- Password Modal -->
    <Transition name="fade">
      <div v-if="showPasswordModal" class="password-modal-overlay" @click="showPasswordModal = false">
        <div class="password-modal" @click.stop>
          <h3>访问受限</h3>
          <p>请输入密码以访问 "{{ currentGroupToUnlock }}" 分组</p>
          <input
            v-model="passwordInput"
            type="password"
            placeholder="Password"
            @keyup.enter="verifyPassword"
          />
          <p v-if="passwordError" class="error-message">{{ passwordError }}</p>
          <button @click="verifyPassword">确认</button>
        </div>
      </div>
    </Transition>
    <!-- Tooltip -->
    <Transition name="fade">
      <div
        v-if="tooltip.visible"
        class="tooltip"
        :style="tooltip.style"
      >
        {{ tooltip.content }}
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, defineAsyncComponent } from "vue";
import { Icon } from "@vicons/utils";
// 可前往 https://www.xicons.org 自行挑选并在此处引入
import { Close, Apps, EllipsisHorizontal } from "@vicons/ionicons5";
import { mainStore } from "@/store";
import { Swiper, SwiperSlide } from "swiper/vue";
import { Pagination, Mousewheel } from "swiper/modules";
import homeSiteLinksFromFile from "@/assets/siteLinks.json";
import allSiteLinksFromFile from "@/assets/allSiteLinks.json";

// 动态图标解析
const siteIcon = new Proxy({}, {
  get(target, name) {
    if (name in target) return target[name];
    if (typeof name === 'string' && !name.startsWith('__') && name !== 'prototype') {
      const component = defineAsyncComponent(() =>
        import('@vicons/fa').then(m => m[name])
      );
      target[name] = component;
      return component;
    }
  }
});

const store = mainStore();
const showAllSites = ref(false);
const homeSiteLinks = ref([]);
const allSiteLinks = ref({});
const activeTab = ref("");

// Password Protection State
const protectedGroups = ["个人", "DEMO"];
const unlockedGroups = ref([]);
const showPasswordModal = ref(false);
const passwordInput = ref("");
const passwordError = ref("");
const currentGroupToUnlock = ref("");

// Tooltip State
const tooltip = ref({
  visible: false,
  content: "",
  style: {
    top: "0px",
    left: "0px",
  },
});

// NocoDB 数据处理
onMounted(async () => {
  // API endpoint 现在是我们自己的 serverless function
  const url = "/api/getLinks";

  const fallback = () => {
    homeSiteLinks.value = homeSiteLinksFromFile;
    allSiteLinks.value = allSiteLinksFromFile;
    if (Object.keys(allSiteLinksFromFile).length > 0) {
      activeTab.value = Object.keys(allSiteLinksFromFile)[0];
    }
  };

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // 如果API路由不存在或返回错误（例如，在没有代理的纯静态服务器上），则回退
      if (response.status === 404) {
        console.log("API route not found, likely running in a non-proxied environment. Using local data.");
      } else {
        console.error(`API fetch error! status: ${response.status}, using local data.`);
      }
      fallback();
      return;
    }
    const data = await response.json();
    if (data && data.list) {
      // 筛选首页链接 (is_home 字段必须为 true)
      homeSiteLinks.value = data.list.filter((item) => item.is_home === 'true');

      // 格式化所有链接用于“全部”弹窗
      const formattedLinks = {};
      data.list.forEach((item) => {
        const category = item.category || "其他";
        if (!formattedLinks[category]) {
          formattedLinks[category] = [];
        }
        formattedLinks[category].push({
          name: item.name,
          link: item.link,
          icon: item.icon,
          status: item.status,
          description: item.description, // <-- Add description field
        });
      });
      allSiteLinks.value = formattedLinks;
      if (Object.keys(formattedLinks).length > 0) {
        activeTab.value = Object.keys(formattedLinks)[0];
      }
    } else {
      console.warn(
        "API response format is not as expected, using local fallback."
      );
      fallback();
    }
  } catch (error) {
    console.error("Failed to fetch from API, using local data:", error);
    fallback();
  }
});

// 计算网站链接
const siteLinksList = computed(() => {
  const result = [];
  for (let i = 0; i < homeSiteLinks.value.length; i += 6) {
    const subArr = homeSiteLinks.value.slice(i, i + 6);
    result.push(subArr);
  }
  return result;
});

// 链接跳转
const jumpLink = (data) => {
  if (data.name === "音乐" && store.musicClick) {
    if (typeof $openList === "function") $openList();
  } else {
    window.open(data.link, "_blank");
  }
};

// Tooltip Handlers
const showTooltip = (event, item) => {
  if (item.description) {
    tooltip.value.visible = true;
    tooltip.value.content = item.description;
    // Position tooltip near the cursor
    tooltip.value.style.top = `${event.clientY + 15}px`;
    tooltip.value.style.left = `${event.clientX + 15}px`;
  }
};

const hideTooltip = () => {
  tooltip.value.visible = false;
};

// Password Protection Handlers
const handleTabClick = (tab) => {
  if (protectedGroups.includes(tab) && !unlockedGroups.value.includes(tab)) {
    currentGroupToUnlock.value = tab;
    passwordInput.value = "";
    passwordError.value = "";
    showPasswordModal.value = true;
  } else {
    activeTab.value = tab;
  }
};

const verifyPassword = async () => {
  if (!passwordInput.value) {
    passwordError.value = "请输入密码";
    return;
  }
  try {
    const response = await fetch("/api/verifyPassword", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ password: passwordInput.value }),
    });
    const data = await response.json();
    if (response.ok && data.success) {
      unlockedGroups.value.push(currentGroupToUnlock.value);
      activeTab.value = currentGroupToUnlock.value;
      showPasswordModal.value = false;
    } else {
      passwordError.value = data.error || "密码错误";
    }
  } catch (error) {
    console.error("Password verification failed:", error);
    passwordError.value = "验证时发生错误";
  }
};
</script>

<style lang="scss" scoped>
.links {
  .line {
    margin: 2rem 0.25rem 1rem;
    font-size: 1.1rem;
    display: flex;
    align-items: center;
    animation: fade 0.5s;
    .title {
      margin-left: 8px;
      font-size: 1.15rem;
      text-shadow: 0 0 5px #00000050;
    }
    .all-button {
      margin-left: auto;
      border-radius: 6px;
      background-color: #ffffff20;
      padding: 2px 6px;
      border: 1px solid #ffffff60;
      transition: all 0.3s;
      cursor: pointer;
      display: flex;
      align-items: center;
      .text {
        margin-left: 4px;
      }
      &:hover {
        background-color: #ffffff30;
        border-color: #ffffff80;
      }
      &:active {
        transform: scale(0.95);
      }
    }
  }
  .swiper {
    left: -10px;
    width: calc(100% + 20px);
    padding: 5px 10px 0;
    z-index: 0;
    .swiper-slide {
      height: 100%;
    }
    .swiper-pagination {
      margin-top: 12px;
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      :deep(.swiper-pagination-bullet) {
        background-color: #fff;
        width: 20px;
        height: 4px;
        margin: 0 4px;
        border-radius: 4px;
        opacity: 0.2;
        transition: opacity 0.3s;
        &.swiper-pagination-bullet-active {
          opacity: 1;
        }
        &:hover {
          opacity: 1;
        }
      }
    }
  }
  .link-all {
    height: 220px;
    .item {
      height: 100px;
      width: 100%;
      display: flex;
      align-items: center;
      flex-direction: row;
      justify-content: center;
      padding: 0 10px;
      animation: fade 0.5s;
      position: relative; // For status badge positioning

      .status-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        box-shadow: 0 0 5px rgba(0, 0, 0, 0.5);

        &.status-online {
          background-color: #64FFDA;
          box-shadow: 0 0 5px #64FFDA;
          animation: glow 1.5s infinite alternate;
        }

        &.status-down {
          background-color: #FF6B6B;
        }

        &.status-maintenance {
          background-color: #FFD166;
        }
      }

      &:hover {
        transform: scale(1.02);
        background: rgb(0 0 0 / 40%);
        transition: 0.3s;
      }

      &:active {
        transform: scale(1);
      }

      .name {
        font-size: 1.1rem;
        margin-left: 8px;
      }
      @media (min-width: 720px) and (max-width: 820px) {
        .name {
          display: none;
        }
      }
      @media (max-width: 720px) {
        height: 80px;
      }
      @media (max-width: 460px) {
        flex-direction: column;
        .name {
          font-size: 1rem;
          margin-left: 0;
          margin-top: 8px;
        }
      }
    }
    @media (max-width: 720px) {
      height: 180px;
    }
  }
  .all-sites {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: #00000080;
    -webkit-backdrop-filter: blur(20px);
    backdrop-filter: blur(20px);
    z-index: 2;
    display: flex;
    justify-content: center;
    align-items: center;
    .modal {
      width: 80%;
      height: 80%;
      background-color: #ffffff10;
      border: 1px solid #ffffff30;
      border-radius: 12px;
      box-shadow: 0 0 20px #00000030;
      animation: zoom-in 0.3s forwards;
      display: flex;
      flex-direction: column;
      @media (max-width: 768px) {
        width: 95%;
        height: 90%;
      }
      .title {
        display: flex;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid #ffffff30;
        font-size: 1.2rem;
        span {
          margin-left: 8px;
        }
        .close {
          margin-left: auto;
          cursor: pointer;
          transition: all 0.3s;
          &:hover {
            color: #ff0000;
            transform: scale(1.1);
          }
        }
      }
      .all-list {
        flex: 1;
        display: flex;
        height: 100%;
        overflow: hidden;
        @media (max-width: 768px) {
          flex-direction: column;
        }
        .tabs {
          width: 120px;
          height: 100%;
          border-right: 1px solid #ffffff30;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          padding: 12px 0;
          @media (max-width: 768px) {
            width: 100%;
            height: auto;
            border-right: none;
            border-bottom: 1px solid #ffffff30;
            flex-direction: row;
            justify-content: flex-start;
            overflow-x: auto;
            padding: 0 12px;
          }
          .tab {
            font-size: 1.1rem;
            padding: 14px 0;
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
            text-align: center;
            @media (max-width: 768px) {
              padding: 12px 10px;
              flex-shrink: 0;
            }
            &.active {
              color: #fff;
              font-weight: bold;
              &::before {
                content: "";
                position: absolute;
                left: 20px;
                top: 50%;
                transform: translateY(-50%);
                width: 4px;
                height: 24px;
                border-radius: 4px;
                background: linear-gradient(
                  to bottom,
                  #ff00ff,
                  #00ffff
                );
                box-shadow: 0 0 5px #ff00ff, 0 0 10px #00ffff;
                @media (max-width: 768px) {
                  width: 60%;
                  height: 4px;
                  left: 50%;
                  top: auto;
                  bottom: 0;
                  transform: translateX(-50%);
                  background: linear-gradient(to right, #ff00ff, #00ffff);
                }
              }
            }
            &:not(.active) {
              color: #ffffff80;
              &:hover {
                color: #fff;
              }
            }
          }
        }
        .content {
          flex: 1;
          padding: 20px;
          overflow-y: auto;
          .link-all {
            height: auto;
            .item {
              margin-bottom: 20px;
              &:hover {
                transform: translateY(-4px) scale(1.02);
                box-shadow: 0 4px 12px #00000040;
                background: rgb(0 0 0 / 40%);
              }
            }
          }
          @media (max-width: 768px) {
            padding: 20px 10px;
            .link-all {
              .el-col {
                flex: 0 0 50%;
                max-width: 50%;
              }
            }
          }
        }
      }
    }
  }
}

.locked-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #ffffff80;
  text-align: center;
  p {
    margin-top: 1rem;
    font-size: 1.2rem;
  }
}

.password-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  z-index: 1000;
  display: flex;
  justify-content: center;
  align-items: center;
}

.password-modal {
  background-color: rgba(10, 25, 47, 0.9);
  border: 1px solid #64FFDA;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
  text-align: center;
  box-shadow: 0 0 20px rgba(100, 255, 218, 0.3);
  animation: zoom-in 0.3s forwards;

  h3 {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
    color: #fff;
  }

  p {
    margin-bottom: 1.5rem;
    color: #ffffffb3;
  }

  input {
    width: 100%;
    padding: 12px;
    border-radius: 6px;
    border: 1px solid #ffffff60;
    background-color: #ffffff10;
    color: #fff;
    font-size: 1rem;
    margin-bottom: 1rem;
    text-align: center;
    transition: all 0.3s;

    &:focus {
      outline: none;
      border-color: #64FFDA;
      box-shadow: 0 0 10px rgba(100, 255, 218, 0.5);
    }
  }

  .error-message {
    color: #FF6B6B;
    margin-bottom: 1rem;
    min-height: 1.2em;
  }

  button {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 6px;
    background-color: #64FFDA;
    color: #0A192F;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
      background-color: #fff;
      box-shadow: 0 0 15px #64FFDA;
    }
  }
}

.tooltip {
  position: fixed;
  padding: 10px 15px;
  background-color: rgba(10, 25, 47, 0.85);
  border: 1px solid #64FFDA;
  color: #fff;
  border-radius: 8px;
  font-size: 14px;
  pointer-events: none;
  z-index: 999;
  max-width: 300px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  transition: opacity 0.3s ease;
}

@keyframes zoom-in {
  from {
    transform: scale(0.95);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes glow {
  from {
    box-shadow: 0 0 3px #64FFDA;
  }
  to {
    box-shadow: 0 0 8px #64FFDA, 0 0 12px #64FFDA;
  }
}
</style>
